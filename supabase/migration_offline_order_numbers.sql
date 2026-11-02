-- Allocate permanent, monthly MPCJR numbers for Offline orders.
LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.offline_order_number_counters (
  period TEXT PRIMARY KEY CHECK (period ~ '^(0[1-9]|1[0-2])[0-9]{2}$'),
  last_value BIGINT NOT NULL CHECK (last_value >= 0)
);
ALTER TABLE public.offline_order_number_counters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.offline_order_number_allocations (
  order_id TEXT PRIMARY KEY,
  period TEXT NOT NULL CHECK (period ~ '^(0[1-9]|1[0-2])[0-9]{2}$'),
  order_number TEXT NOT NULL UNIQUE
);
ALTER TABLE public.offline_order_number_allocations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.offline_order_number_counters (period, last_value)
SELECT
  substring(order_number FROM 7 FOR 4) AS period,
  MAX(substring(order_number FROM 12)::BIGINT) AS last_value
FROM public.orders
WHERE sales_channel = 'Offline'
  AND order_number ~ '^MPCJR-(0[1-9]|1[0-2])[0-9]{2}-[0-9]{4,}$'
GROUP BY substring(order_number FROM 7 FOR 4)
ON CONFLICT (period) DO UPDATE
SET last_value = GREATEST(
  public.offline_order_number_counters.last_value,
  EXCLUDED.last_value
);

CREATE OR REPLACE FUNCTION public.next_offline_order_number(
  p_order_date DATE,
  p_order_id TEXT,
  p_force_new BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  number_period TEXT;
  counter_value BIGINT;
  highest_existing BIGINT;
  next_value BIGINT;
  allocated_number TEXT;
BEGIN
  IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('owner', 'admin'), TRUE) THEN
    RAISE EXCEPTION 'Owner or admin role is required for order number allocation'
      USING ERRCODE = '42501';
  END IF;
  IF p_order_date IS NULL THEN
    RAISE EXCEPTION 'Order date is required for Offline order number allocation'
      USING ERRCODE = '22023';
  END IF;
  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0 THEN
    RAISE EXCEPTION 'Order ID is required for number allocation'
      USING ERRCODE = '22023';
  END IF;

  number_period := to_char(p_order_date, 'MMYY');
  PERFORM pg_advisory_xact_lock(hashtext(p_order_id));

  IF NOT COALESCE(p_force_new, FALSE) THEN
    SELECT order_number
    INTO allocated_number
    FROM public.offline_order_number_allocations
    WHERE order_id = p_order_id;

    IF allocated_number IS NOT NULL THEN
      RETURN allocated_number;
    END IF;
  END IF;

  INSERT INTO public.offline_order_number_counters (period, last_value)
  VALUES (number_period, 0)
  ON CONFLICT (period) DO NOTHING;

  SELECT last_value
  INTO counter_value
  FROM public.offline_order_number_counters
  WHERE period = number_period
  FOR UPDATE;

  SELECT COALESCE(MAX(assigned.sequence_number), 0)
  INTO highest_existing
  FROM (
    SELECT substring(order_number FROM 12)::BIGINT AS sequence_number
    FROM public.orders
    WHERE sales_channel = 'Offline'
      AND order_number ~ ('^MPCJR-' || number_period || '-[0-9]{4,}$')

    UNION ALL

    SELECT substring(order_number FROM 12)::BIGINT AS sequence_number
    FROM public.offline_order_number_allocations
    WHERE period = number_period
      AND order_number ~ ('^MPCJR-' || number_period || '-[0-9]{4,}$')
  ) AS assigned;

  next_value := GREATEST(counter_value, highest_existing) + 1;

  UPDATE public.offline_order_number_counters
  SET last_value = next_value
  WHERE period = number_period;

  allocated_number := 'MPCJR-' || number_period || '-' ||
    lpad(next_value::TEXT, GREATEST(4, length(next_value::TEXT)), '0');

  INSERT INTO public.offline_order_number_allocations (order_id, period, order_number)
  VALUES (p_order_id, number_period, allocated_number)
  ON CONFLICT (order_id) DO UPDATE
  SET period = EXCLUDED.period,
      order_number = EXCLUDED.order_number;

  RETURN allocated_number;
END;
$$;

REVOKE ALL ON TABLE public.offline_order_number_counters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.offline_order_number_allocations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_offline_order_number(DATE, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_offline_order_number(DATE, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
