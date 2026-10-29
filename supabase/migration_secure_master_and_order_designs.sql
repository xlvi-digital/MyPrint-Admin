-- Run after migration_order_channels_and_master_data.sql.
-- Replaces permissive application-table policies with owner/admin access.
-- Existing rows and public reads of legacy collar-reference images are preserved.

DO $$
DECLARE
  target_table TEXT;
  existing_policy RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'materials',
    'jersey_sizes',
    'product_types',
    'collar_models',
    'profiles',
    'orders',
    'order_items',
    'order_designs',
    'order_printing',
    'order_collar',
    'order_activity_logs'
  ]
  LOOP
    FOR existing_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, target_table);
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jersey_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collar_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_printing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_collar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_designs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['materials', 'jersey_sizes', 'product_types', 'collar_models']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated users can read ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''owner'', ''admin'')) WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''owner'', ''admin''))',
      'Owners and admins manage ' || target_table,
      target_table
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles',
    'orders',
    'order_items',
    'order_designs',
    'order_printing',
    'order_collar',
    'order_activity_logs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''owner'', ''admin'')) WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''owner'', ''admin''))',
      'Owners and admins manage ' || target_table,
      target_table
    );
  END LOOP;
END;
$$;

REVOKE ALL ON public.materials, public.jersey_sizes, public.product_types, public.collar_models FROM PUBLIC, anon;
GRANT SELECT ON public.materials, public.jersey_sizes, public.product_types, public.collar_models TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materials, public.jersey_sizes, public.product_types, public.collar_models TO authenticated;
REVOKE ALL ON public.profiles, public.orders, public.order_items, public.order_designs,
  public.order_printing, public.order_collar, public.order_activity_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.orders, public.order_items,
  public.order_designs, public.order_printing, public.order_collar, public.order_activity_logs TO authenticated;

ALTER TABLE public.order_designs
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

CREATE INDEX IF NOT EXISTS idx_order_designs_storage_ref
  ON public.order_designs (storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-designs-private',
  'order-designs-private',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Owners and admins can read private order designs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can upload private order designs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update private order designs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete private order designs" ON storage.objects;

CREATE POLICY "Owners and admins can read private order designs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-designs-private'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );
CREATE POLICY "Owners and admins can upload private order designs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-designs-private'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );
CREATE POLICY "Owners and admins can update private order designs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'order-designs-private'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  )
  WITH CHECK (
    bucket_id = 'order-designs-private'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );
CREATE POLICY "Owners and admins can delete private order designs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-designs-private'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Collar references are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Allow collar references upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow collar references update" ON storage.objects;
DROP POLICY IF EXISTS "Allow collar references delete" ON storage.objects;
DROP POLICY IF EXISTS "Legacy collar references remain publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can upload collar references" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can update collar references" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete collar references" ON storage.objects;

CREATE POLICY "Legacy collar references remain publicly viewable" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('collar-references', 'order-designs'));
CREATE POLICY "Owners and admins can upload collar references" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('collar-references', 'order-designs')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );
CREATE POLICY "Owners and admins can update collar references" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('collar-references', 'order-designs')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  )
  WITH CHECK (
    bucket_id IN ('collar-references', 'order-designs')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );
CREATE POLICY "Owners and admins can delete collar references" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('collar-references', 'order-designs')
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin')
  );

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
  IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('owner', 'admin'), TRUE) THEN
    RAISE EXCEPTION 'Owner or admin role is required for order number allocation'
      USING ERRCODE = '42501';
  END IF;
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

REVOKE ALL ON FUNCTION public.next_order_number(INTEGER, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_number(INTEGER, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
