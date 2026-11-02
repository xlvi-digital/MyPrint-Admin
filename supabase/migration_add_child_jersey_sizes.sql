INSERT INTO public.jersey_sizes (code, name)
VALUES
  ('2A', '2A'),
  ('4A', '4A'),
  ('6A', '6A'),
  ('8A', '8A'),
  ('10A', '10A'),
  ('12A', '12A'),
  ('14A', '14A'),
  ('16A', '16A')
ON CONFLICT DO NOTHING;
