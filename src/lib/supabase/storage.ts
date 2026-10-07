import { supabase } from "./auth";

const DOCUMENTS_BUCKET = "documents";
const IMAGES_BUCKET = "images";
const EVIDENCE_BUCKET = "evidence";

function throwStorageError(error: {
  message?: string;
  statusCode?: string | number;
}): never {
  const message = error.message || "Falha desconhecida no armazenamento.";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("permission")
  ) {
    throw new Error(
      "O Supabase Storage recusou o upload por falta de permissão no bucket. Execute a migration mais recente e tente novamente.",
    );
  }

  if (
    normalizedMessage.includes("mime type") ||
    normalizedMessage.includes("content type")
  ) {
    throw new Error(
      "Formato de imagem não permitido. Envie JPG, PNG, WEBP ou GIF.",
    );
  }

  if (
    normalizedMessage.includes("maximum allowed size") ||
    normalizedMessage.includes("too large")
  ) {
    throw new Error(
      "A imagem excede o limite de 10 MB permitido pelo sistema.",
    );
  }

  throw new Error(`Falha no upload da imagem: ${message}`);
}

function createSafeFileName(fileName: string) {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()?.toLowerCase()}`
    : "";
  const baseName =
    fileName
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "arquivo";

  return `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;
}

// Upload document
export async function uploadDocument(file: File, folder: string = "documents") {
  const fileName = createSafeFileName(file.name);
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
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
export async function uploadImage(file: File, folder: string = "uploads") {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  ) {
    throw new Error(
      "Formato de imagem não permitido. Envie JPG, PNG, WEBP ou GIF.",
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      "A imagem excede o limite de 10 MB permitido pelo sistema.",
    );
  }

  const fileName = createSafeFileName(file.name);
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throwStorageError(error);

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
  const fileName = createSafeFileName(file.name);
  const filePath = `occurrences/${occurrenceId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
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
export async function deleteFile(
  bucket: "documents" | "images" | "evidence",
  path: string,
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw error;
}

// Get signed URL (for private downloads)
export async function getSignedUrl(
  bucket: "documents" | "images" | "evidence",
  path: string,
  expiresIn: number = 3600,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// List files in folder
export async function listFiles(
  bucket: "documents" | "images" | "evidence",
  folder: string,
) {
  const { data, error } = await supabase.storage.from(bucket).list(folder);

  if (error) throw error;
  return data;
}
