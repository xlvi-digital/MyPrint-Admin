-- ==============================================================================
-- MYPRINTIN ADMIN: MIGRATION FOR ORDER COLLAR & SUPABASE STORAGE BUCKET
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Ensure columns exist on order_collar table (idempotent, safe to rerun)
ALTER TABLE order_collar ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE order_collar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create dedicated Supabase Storage Bucket for collar references (if not already created)
INSERT INTO storage.buckets (id, name, public)
VALUES ('collar-references', 'collar-references', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-designs', 'order-designs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security policies for collar-references bucket
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

-- 4. Reload PostgREST schema cache to immediately reflect column additions
NOTIFY pgrst, 'reload schema';
