
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true);

CREATE POLICY "Anyone can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');
