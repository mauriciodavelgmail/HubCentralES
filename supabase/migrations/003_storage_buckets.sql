-- Buckets used by the application.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', true, 10485760, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('images', 'images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('evidence', 'evidence', true, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can read app files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload app files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update app files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app files" ON storage.objects;

CREATE POLICY "Authenticated users can read app files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('documents', 'images', 'evidence'));

CREATE POLICY "Authenticated users can upload app files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('documents', 'images', 'evidence'));

CREATE POLICY "Authenticated users can update app files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('documents', 'images', 'evidence'))
WITH CHECK (bucket_id IN ('documents', 'images', 'evidence'));

CREATE POLICY "Authenticated users can delete app files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('documents', 'images', 'evidence'));
