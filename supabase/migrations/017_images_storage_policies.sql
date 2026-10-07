-- Ensure the public images bucket accepts authenticated application uploads.
-- This migration is intentionally independent from 003 because some existing
-- environments created the bucket manually without creating its RLS policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "HubCentral authenticated users can read images" ON storage.objects;
DROP POLICY IF EXISTS "HubCentral authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "HubCentral authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "HubCentral authenticated users can delete images" ON storage.objects;

CREATE POLICY "HubCentral authenticated users can read images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "HubCentral authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "HubCentral authenticated users can update images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

CREATE POLICY "HubCentral authenticated users can delete images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'images');
