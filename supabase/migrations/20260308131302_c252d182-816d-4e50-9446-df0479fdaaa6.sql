
-- Add proof photo column to deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_photo_url TEXT DEFAULT NULL;

-- Create storage bucket for delivery proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: drivers can upload proof photos
CREATE POLICY "Drivers can upload proof photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs');

-- Anyone can view proof photos (public bucket)
CREATE POLICY "Public can view proof photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'delivery-proofs');
