import { supabase } from './auth';

const DOCUMENTS_BUCKET = 'documents';
const IMAGES_BUCKET = 'images';
const EVIDENCE_BUCKET = 'evidence';

// Upload document
export async function uploadDocument(file: File, folder: string = 'documents') {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

// Upload image
export async function uploadImage(file: File, folder: string = 'uploads') {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

// Upload evidence (for occurrences)
export async function uploadEvidence(file: File, occurrenceId: string) {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `occurrences/${occurrenceId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(EVIDENCE_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

// Delete file
export async function deleteFile(bucket: 'documents' | 'images' | 'evidence', path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw error;
}

// Get signed URL (for private downloads)
export async function getSignedUrl(bucket: 'documents' | 'images' | 'evidence', path: string, expiresIn: number = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// List files in folder
export async function listFiles(bucket: 'documents' | 'images' | 'evidence', folder: string) {
  const { data, error } = await supabase.storage.from(bucket).list(folder);

  if (error) throw error;
  return data;
}
