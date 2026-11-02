-- Persist optional-feature activation so disabled inputs are not treated as order data.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS use_designs BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS use_collar_rib BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS use_notes BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.orders AS orders
SET
  use_designs = EXISTS (
    SELECT 1 FROM public.order_designs AS designs WHERE designs.order_id = orders.id
  ),
  use_collar_rib = COALESCE(orders.rib, 'Tidak Pakai Rib') <> 'Tidak Pakai Rib'
    OR EXISTS (
      SELECT 1
      FROM public.order_collar AS collar
      WHERE collar.order_id = orders.id
        AND (
          COALESCE(collar.model_name, 'POLO KANCING 2') <> 'POLO KANCING 2'
          OR collar.image_url IS NOT NULL
        )
    ),
  use_notes = NULLIF(BTRIM(orders.notes), '') IS NOT NULL
    AND REPLACE(orders.notes, E'\r\n', E'\n')
      <> 'DATA TERPISAH DI HALAMAN BELAKANG\nTIDAK PAKAI RIB';

NOTIFY pgrst, 'reload schema';
