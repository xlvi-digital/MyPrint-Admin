ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS sleeve TEXT
  CHECK (sleeve IN ('Pendek', 'Panjang'));
