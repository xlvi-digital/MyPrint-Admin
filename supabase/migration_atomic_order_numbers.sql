-- Keep yearly order numbers unique across browsers and concurrent admins.
-- orders.order_number is TEXT; seed the counter from existing ORD-YYYY-NNNN values.
DO $$
DECLARE
  order_number_type TEXT;
BEGIN
  SELECT data_type
  INTO order_number_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'order_number';

  IF order_number_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'Expected public.orders.order_number to be TEXT, found %',
      COALESCE(order_number_type, 'missing column');
  END IF;
END;
$$;

LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.order_number_counters (
  order_year INTEGER PRIMARY KEY CHECK (order_year BETWEEN 2000 AND 9999),
  last_value BIGINT NOT NULL CHECK (last_value >= 0)
);
ALTER TABLE public.order_number_counters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_number_allocations (
  order_id TEXT PRIMARY KEY,
  order_year INTEGER NOT NULL CHECK (order_year BETWEEN 2000 AND 9999),
  order_number TEXT NOT NULL UNIQUE
);
ALTER TABLE public.order_number_allocations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.order_number_counters (order_year, last_value)
SELECT
  substring(order_number FROM 5 FOR 4)::INTEGER AS order_year,
  MAX(substring(order_number FROM 10)::BIGINT) AS last_value
FROM public.orders
WHERE order_number ~ '^ORD-[0-9]{4}-[0-9]{4,}$'
  AND substring(order_number FROM 5 FOR 4)::INTEGER BETWEEN 2000 AND 9999
GROUP BY substring(order_number FROM 5 FOR 4)::INTEGER
ON CONFLICT (order_year) DO UPDATE
SET last_value = GREATEST(
  public.order_number_counters.last_value,
  EXCLUDED.last_value
);

DROP FUNCTION IF EXISTS public.next_order_number(INTEGER);

CREATE OR REPLACE FUNCTION public.next_order_number(
  p_year INTEGER,
  p_order_id TEXT,
  p_force_new BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  counter_value BIGINT;
  highest_existing BIGINT;
  next_value BIGINT;
  allocated_number TEXT;
BEGIN
  IF p_year IS NULL OR p_year < 2000 OR p_year > 9999 THEN
    RAISE EXCEPTION 'Invalid order number year: %', p_year
      USING ERRCODE = '22023';
  END IF;
  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0 THEN
    RAISE EXCEPTION 'Order ID is required for number allocation'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_order_id));

  IF NOT COALESCE(p_force_new, FALSE) THEN
    SELECT order_number
    INTO allocated_number
    FROM public.order_number_allocations
    WHERE order_id = p_order_id;

    IF allocated_number IS NOT NULL THEN
      RETURN allocated_number;
    END IF;
  END IF;

  INSERT INTO public.order_number_counters (order_year, last_value)
  VALUES (p_year, 0)
  ON CONFLICT (order_year) DO NOTHING;

  SELECT last_value
  INTO counter_value
  FROM public.order_number_counters
  WHERE order_year = p_year
  FOR UPDATE;

  SELECT COALESCE(MAX(assigned.sequence_number), 0)
  INTO highest_existing
  FROM (
    SELECT substring(order_number FROM 10)::BIGINT AS sequence_number
    FROM public.orders
    WHERE order_number ~ ('^ORD-' || p_year::TEXT || '-[0-9]{4,}$')

    UNION ALL

    SELECT substring(order_number FROM 10)::BIGINT AS sequence_number
    FROM public.order_number_allocations
    WHERE order_year = p_year
      AND order_number ~ ('^ORD-' || p_year::TEXT || '-[0-9]{4,}$')
  ) AS assigned;

  next_value := GREATEST(counter_value, highest_existing) + 1;

  UPDATE public.order_number_counters
  SET last_value = next_value
  WHERE order_year = p_year;

  allocated_number := 'ORD-' || p_year::TEXT || '-' ||
    lpad(next_value::TEXT, GREATEST(4, length(next_value::TEXT)), '0');

  INSERT INTO public.order_number_allocations (order_id, order_year, order_number)
  VALUES (p_order_id, p_year, allocated_number)
  ON CONFLICT (order_id) DO UPDATE
  SET order_year = EXCLUDED.order_year,
      order_number = EXCLUDED.order_number;

  RETURN allocated_number;
END;
$$;

REVOKE ALL ON TABLE public.order_number_counters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.order_number_allocations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_order_number(INTEGER, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_number(INTEGER, TEXT, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
