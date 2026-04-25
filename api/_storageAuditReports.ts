// Helpers Supabase Storage pour le bucket privé `audit-reports`.
//
// Session 2D — Étape 1 : squelette des deux fonctions clés utilisées
// par les endpoints admin (génération, téléchargement) et par le flux
// `approve-and-send`. Implémentation complète à l'Étape 3.
//
// Convention de nommage des blobs :
//   <audit_id>/audit-<slug-client>-<timestamp>.docx
// Ce schéma garde un historique simple via le timestamp dans le nom,
// sans nécessiter de table de versionning.

import { getSupabaseAdmin } from './_supabaseAdmin';

const BUCKET = 'audit-reports';
const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Construit un chemin de blob déterministe pour un audit + slug client.
 * Le timestamp permet un historique implicite (chaque régénération
 * produit un nouveau fichier ; cleanup des anciens à voir plus tard).
 */
export function buildDocxStoragePath(
  auditId: string,
  clientSlug: string,
): string {
  const safeSlug = clientSlug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'client';
  const ts = Date.now();
  return `${auditId}/audit-${safeSlug}-${ts}.docx`;
}

/**
 * Upload un buffer DOCX dans le bucket privé. Retourne le chemin
 * effectivement écrit. Lève une erreur explicite en cas d'échec.
 */
export async function uploadDocx(
  storagePath: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: DOCX_CONTENT_TYPE,
      upsert: true,
    });
  if (error) {
    throw new Error(`Upload DOCX échoué (${storagePath}) : ${error.message}`);
  }
  return storagePath;
}

/**
 * Télécharge un DOCX du bucket sous forme de Buffer (pour pièce jointe
 * courriel). Lève une erreur si le blob n'existe pas.
 */
export async function downloadDocx(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(
      `Download DOCX échoué (${storagePath}) : ${error?.message ?? 'pas de data'}`,
    );
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Génère une URL signée temporaire pour permettre le téléchargement
 * direct depuis l'admin. Expire par défaut après 15 minutes.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds = 900,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Signature URL DOCX échouée (${storagePath}) : ${error?.message ?? 'pas de signedUrl'}`,
    );
  }
  return data.signedUrl;
}
