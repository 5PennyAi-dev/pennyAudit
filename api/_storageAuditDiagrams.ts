// Helpers Supabase Storage pour le bucket privé `audit-diagrams`.
//
// Session 2E — Étape 4. Mirror de _storageAuditReports.ts adapté aux
// diagrammes générés par Gemini Nano Banana Pro.
//
// Convention de nommage des blobs :
//   <audit_id>/<solution_id>.<png|jpg>
// Pas de timestamp dans le nom : la régénération écrase l'ancien
// fichier au même path (suffisant pour le MVP, pas de versioning).

import { getSupabaseAdmin } from './_supabaseAdmin';

const BUCKET = 'audit-diagrams';

export type DiagramMimeType = 'image/png' | 'image/jpeg';

function extensionFromMime(mimeType: DiagramMimeType): 'png' | 'jpg' {
  return mimeType === 'image/jpeg' ? 'jpg' : 'png';
}

/**
 * Construit un chemin de blob déterministe pour un diagramme. Le
 * solution_id correspond au pattern_id de l'opportunité.
 */
export function buildDiagramStoragePath(
  auditId: string,
  solutionId: string,
  mimeType: DiagramMimeType,
): string {
  const safe = solutionId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'solution';
  return `${auditId}/${safe}.${extensionFromMime(mimeType)}`;
}

/**
 * Upload un PNG ou JPEG dans le bucket privé. Écrase le fichier si
 * un blob existe déjà au même path (upsert: true).
 */
export async function uploadDiagram(
  storagePath: string,
  buffer: Buffer,
  mimeType: DiagramMimeType,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
  if (error) {
    throw new Error(`Upload diagramme échoué (${storagePath}) : ${error.message}`);
  }
  return storagePath;
}

/**
 * Télécharge un diagramme du bucket sous forme de Buffer (pour insertion
 * dans le DOCX). Lève une erreur si le blob n'existe pas.
 */
export async function downloadDiagram(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(
      `Download diagramme échoué (${storagePath}) : ${error?.message ?? 'pas de data'}`,
    );
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Génère une URL signée temporaire pour afficher le diagramme dans
 * l'admin ou dans la page rapport publique. Expire par défaut après
 * 15 minutes — à régénérer à chaque chargement de page.
 */
export async function getDiagramSignedUrl(
  storagePath: string,
  expiresInSeconds = 900,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Signature URL diagramme échouée (${storagePath}) : ${error?.message ?? 'pas de signedUrl'}`,
    );
  }
  return data.signedUrl;
}
