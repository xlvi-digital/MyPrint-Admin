-- ==============================================================================
-- MYPRINTIN ADMIN — SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Multi-Admin Realtime Order & Production Management System
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Operators, Designers, Admins & Owner)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'designer', 'operator_printing', 'operator_press', 'operator_cutting', 'operator_sewing')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Orders Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT UNIQUE NOT NULL,
  
  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  team_name TEXT,
  customer_address TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline_date DATE,

  -- Product Specs
  product_type TEXT NOT NULL DEFAULT 'Jersey Sublime',
  material TEXT NOT NULL DEFAULT 'Milano',
  color TEXT DEFAULT 'Custom Sublime',
  model TEXT DEFAULT 'Reguler Fit',
  sleeve TEXT DEFAULT 'Pendek',
  rib TEXT DEFAULT 'Tidak Pakai Rib',
  total_quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_payment NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Layout & Production Config
  use_table_threshold INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  production_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (production_status IN ('DRAFT', 'DESAIN', 'PRINTING', 'PRESS', 'CUTTING', 'JAHIT', 'FINISHING', 'SELESAI')),

  -- Signoffs & Approvals
  designer_name TEXT,
  designer_initial TEXT,
  press_signed BOOLEAN NOT NULL DEFAULT false,
  cutting_signed BOOLEAN NOT NULL DEFAULT false,
  jahit_signed BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_by_name TEXT DEFAULT 'Admin Workshop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Order Items / Player Roster (Nama, No Punggung, Ukuran, Qty)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT DEFAULT '',
  size TEXT NOT NULL DEFAULT 'L',
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  sleeve TEXT CHECK (sleeve IN ('Pendek', 'Panjang')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Order Designs (Visual Assets & Mockups)
CREATE TABLE IF NOT EXISTS order_designs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Desain Utama',
  data_url TEXT NOT NULL,
  file_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Order Printing Machines
CREATE TABLE IF NOT EXISTS order_printing (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Order Collar Specs (Model & Visual Reference Photo)
CREATE TABLE IF NOT EXISTS order_collar (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL DEFAULT 'POLO KANCING 2',
  image_url TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Activity & Audit Logs (Realtime Multi-Admin Tracking)
CREATE TABLE IF NOT EXISTS order_activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT 'Admin Workshop',
  actor_role TEXT NOT NULL DEFAULT 'admin',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST WORKSHOP QUERIES & ROSTER SEARCH
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_production_status ON orders(production_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_name ON order_items(name);
CREATE INDEX IF NOT EXISTS idx_order_items_number ON order_items(number);
CREATE INDEX IF NOT EXISTS idx_order_items_size ON order_items(size);

CREATE INDEX IF NOT EXISTS idx_order_designs_order_id ON order_designs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_printing_order_id ON order_printing(order_id);
CREATE INDEX IF NOT EXISTS idx_order_collar_order_id ON order_collar(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_logs_order_id ON order_activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_logs_created_at ON order_activity_logs(created_at DESC);

-- ==============================================================================
-- AUTO-UPDATE UPDATED_AT TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_orders_updated_at ON orders;
CREATE TRIGGER trigger_set_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enables secure authenticated and public access for workshop dashboard
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_printing ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_collar ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity_logs ENABLE ROW LEVEL SECURITY;

-- Workshop policies (allow all operations for public, anon, and authenticated)
DROP POLICY IF EXISTS "Allow all operations for orders" ON orders;
CREATE POLICY "Allow all operations for orders" ON orders FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for order_items" ON order_items;
CREATE POLICY "Allow all operations for order_items" ON order_items FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for order_designs" ON order_designs;
CREATE POLICY "Allow all operations for order_designs" ON order_designs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for order_printing" ON order_printing;
CREATE POLICY "Allow all operations for order_printing" ON order_printing FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for order_collar" ON order_collar;
CREATE POLICY "Allow all operations for order_collar" ON order_collar FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for order_activity_logs" ON order_activity_logs;
CREATE POLICY "Allow all operations for order_activity_logs" ON order_activity_logs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for profiles" ON profiles;
CREATE POLICY "Allow all operations for profiles" ON profiles FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- Permissions grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, postgres;

-- ==============================================================================
-- REALTIME REPLICATION (CRITICAL FOR MULTI-ADMIN SYNCHRONIZATION)
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_activity_logs;
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null; END $$;

-- ==============================================================================
-- SEED INITIAL PROFILES
-- ==============================================================================
INSERT INTO profiles (full_name, role, email)
VALUES 
  ('Owner MyPrintin', 'owner', 'owner@myprintin.id'),
  ('Admin Workshop', 'admin', 'admin@myprintin.id'),
  ('Desainer Grafis', 'designer', 'desain@myprintin.id'),
  ('Operator Mesin Cetak', 'operator_printing', 'print@myprintin.id')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 9. SUPABASE STORAGE BUCKETS & RLS POLICIES
-- Enables uploading & viewing collar references & order designs
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('collar-references', 'collar-references', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-designs', 'order-designs', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for collar-references bucket
DROP POLICY IF EXISTS "Collar references are publicly viewable" ON storage.objects;
CREATE POLICY "Collar references are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Allow collar references upload" ON storage.objects;
CREATE POLICY "Allow collar references upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Allow collar references update" ON storage.objects;
CREATE POLICY "Allow collar references update" 
ON storage.objects FOR UPDATE 
USING (bucket_id IN ('collar-references', 'order-designs'));

DROP POLICY IF EXISTS "Allow collar references delete" ON storage.objects;
CREATE POLICY "Allow collar references delete" 
ON storage.objects FOR DELETE 
USING (bucket_id IN ('collar-references', 'order-designs'));

-- ==============================================================================
-- ATOMIC YEARLY ORDER NUMBER GENERATOR
-- ==============================================================================
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
