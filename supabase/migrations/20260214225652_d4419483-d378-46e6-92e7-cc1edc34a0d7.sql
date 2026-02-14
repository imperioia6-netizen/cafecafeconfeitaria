ALTER TABLE public.profiles
  ADD COLUMN service_rating numeric DEFAULT NULL,
  ADD COLUMN service_notes text DEFAULT NULL;