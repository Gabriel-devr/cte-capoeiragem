import { supabaseAdm } from "@/lib/supabase/server";
import { getMediaMetadata, downloadMedia } from "./client";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/amr": "amr",
  "application/pdf": "pdf",
};

export function mimeToExtension(mime: string): string {
  const clean = mime.split(";")[0].trim();
  return MIME_EXTENSION_MAP[clean] ?? clean.split("/")[1] ?? "bin";
}

// Baixa a mídia recebida (id vem no payload do webhook, não o arquivo em si - é preciso
// primeiro pedir a URL temporária na Graph API) e sobe pro bucket privado 'whatsapp-media'.
// Usa supabaseAdm (service role) porque não existe sessão de usuário numa chamada da Meta,
// e o bucket não tem policy pra anon/authenticated (ver supabase_whatsapp_media.sql).
export async function downloadAndStoreMedia(mediaId: string, whatsappMessageId: string) {
  const metadata = await getMediaMetadata(mediaId);
  if (!metadata.ok) throw new Error(metadata.error);

  const { buffer, contentType } = await downloadMedia(metadata.url);
  const mimeType = contentType || metadata.mimeType;
  const mediaPath = `${whatsappMessageId}.${mimeToExtension(mimeType)}`;

  const { error } = await supabaseAdm.storage
    .from("whatsapp-media")
    .upload(mediaPath, Buffer.from(buffer), { contentType: mimeType, upsert: true });

  if (error) throw error;

  return { mediaPath, mimeType };
}
