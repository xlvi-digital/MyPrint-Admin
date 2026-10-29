-- Add sales channel metadata without changing internal order numbers or existing order data.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sales_channel TEXT NOT NULL DEFAULT 'Offline',
  ADD COLUMN IF NOT EXISTS external_order_number TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_sales_channel_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_sales_channel_check
      CHECK (sales_channel IN ('Offline', 'Shopee', 'Tokopedia'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_sales_channel_external_number
  ON public.orders (sales_channel, external_order_number);

-- Master records intentionally retain their human-readable values in the existing order columns.
-- This keeps historical orders, roster sizes, and collar names compatible without rewriting data.
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jersey_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collar_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS materials_name_lower_key ON public.materials (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS jersey_sizes_code_lower_key ON public.jersey_sizes (LOWER(code));
CREATE UNIQUE INDEX IF NOT EXISTS jersey_sizes_name_lower_key ON public.jersey_sizes (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS product_types_name_lower_key ON public.product_types (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS collar_models_name_lower_key ON public.collar_models (LOWER(name));

-- Preserve every distinct legacy value as an active master choice.
INSERT INTO public.materials (name)
SELECT DISTINCT BTRIM(material) FROM public.orders
WHERE NULLIF(BTRIM(material), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.product_types (name)
SELECT DISTINCT BTRIM(product_type) FROM public.orders
WHERE NULLIF(BTRIM(product_type), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.jersey_sizes (code, name)
SELECT DISTINCT BTRIM(size), BTRIM(size) FROM public.order_items
WHERE NULLIF(BTRIM(size), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.collar_models (name)
SELECT DISTINCT BTRIM(model_name) FROM public.order_collar
WHERE NULLIF(BTRIM(model_name), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.materials (name) VALUES
  ('Milano'), ('Drifit Benzema'), ('Drifit Bintik / Nike'), ('Drifit Jarum'),
  ('Drifit Paving'), ('Lotto'), ('Paragon'), ('Serena'), ('Dryfit Brazil'),
  ('Polyester Sublime'), ('Custom')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_types (name) VALUES
  ('Jersey Sublime'), ('Jersey Sublime Setelan'), ('Jersey Running / Singlet'),
  ('Jaket / Hoodie Sublime'), ('Kaos Event Sublime'), ('Celana Olahraga / Lotto'),
  ('Rompi Futsal / Basket'), ('Custom Apparel')
ON CONFLICT DO NOTHING;

INSERT INTO public.jersey_sizes (code, name) VALUES
  ('XS', 'XS'), ('S', 'S'), ('M', 'M'), ('L', 'L'), ('XL', 'XL'),
  ('XXL', 'XXL'), ('3XL', '3XL'), ('4XL', '4XL'), ('Custom', 'Custom')
ON CONFLICT DO NOTHING;

INSERT INTO public.collar_models (name) VALUES
  ('POLO KANCING 2'), ('POLO KANCING 3'), ('O-NECK STANDAR'), ('O-NECK RIB'),
  ('V-NECK STANDAR'), ('V-NECK RIB TUMPANG'), ('SHANGHAI / MANDARIN'),
  ('KERAH KEMEJA SUBLIME'), ('CUSTOM')
ON CONFLICT DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES public.jersey_sizes(id) ON DELETE SET NULL;
ALTER TABLE public.order_collar
  ADD COLUMN IF NOT EXISTS collar_model_id UUID REFERENCES public.collar_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_material_id ON public.orders (material_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_type_id ON public.orders (product_type_id);
CREATE INDEX IF NOT EXISTS idx_order_items_size_id ON public.order_items (size_id);
CREATE INDEX IF NOT EXISTS idx_order_collar_model_id ON public.order_collar (collar_model_id);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jersey_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collar_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master data readable by order forms" ON public.materials;
DROP POLICY IF EXISTS "Master data editable by workshop admins" ON public.materials;
CREATE POLICY "Master data readable by order forms" ON public.materials
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Master data editable by workshop admins" ON public.materials
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Master data readable by order forms" ON public.jersey_sizes;
DROP POLICY IF EXISTS "Master data editable by workshop admins" ON public.jersey_sizes;
CREATE POLICY "Master data readable by order forms" ON public.jersey_sizes
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Master data editable by workshop admins" ON public.jersey_sizes
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Master data readable by order forms" ON public.product_types;
DROP POLICY IF EXISTS "Master data editable by workshop admins" ON public.product_types;
CREATE POLICY "Master data readable by order forms" ON public.product_types
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Master data editable by workshop admins" ON public.product_types
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Master data readable by order forms" ON public.collar_models;
DROP POLICY IF EXISTS "Master data editable by workshop admins" ON public.collar_models;
CREATE POLICY "Master data readable by order forms" ON public.collar_models
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Master data editable by workshop admins" ON public.collar_models
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'admin'));

GRANT SELECT ON public.materials, public.jersey_sizes, public.product_types, public.collar_models TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.materials, public.jersey_sizes, public.product_types, public.collar_models FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.materials, public.jersey_sizes, public.product_types, public.collar_models TO authenticated;

NOTIFY pgrst, 'reload schema';
