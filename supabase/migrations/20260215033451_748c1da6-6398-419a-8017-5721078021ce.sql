-- Allow anonymous users to read active recipes for the public menu
CREATE POLICY "Public can read active recipes"
ON public.recipes
FOR SELECT
USING (active = true);
