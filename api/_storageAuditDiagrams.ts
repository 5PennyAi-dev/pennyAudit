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
 * Charge tous les diagrammes d'un audit depuis Storage en parallèle, à
 * partir du contenu de `audits.diagrams_metadata`. Utilisé par les
 * endpoints qui construisent le DOCX (generate-docx, approve-and-send).
 *
 * Comportement :
 *   - Pour chaque entrée status === 'ok', télécharge le buffer et le
 *     stocke dans la map sous solution_id.
 *   - Les entrées status === 'failed' sont ignorées (pas de download).
 *   - Si un download individuel échoue (blob manquant, droits), on
 *     log un warning et on continue avec les autres — un diagramme
 *     manquant ne bloque pas la génération du DOCX.
 */
export interface DiagramAsset {
  buffer: Buffer;
  mimeType: DiagramMimeType;
  title: string;
}

export interface DiagramsMetadataEntry {
  title: string;
  storage_path?: string;
  prompt_used: string;
  generated_at: string;
  status: 'ok' | 'failed';
  failure_reason?: string;
}

/**
 * Pour chaque diagramme avec status === 'ok', génère une URL signée
 * de courte durée (15 min) prête à afficher dans <img>. Format renvoyé
 * mappé par solution_id pour faciliter le rendu côté React.
 *
 * Les entrées status === 'failed' sont incluses (sans signed_url) pour
 * que le client puisse afficher la pastille « Échec » associée.
 */
export interface DiagramSignedEntry {
  title: string;
  status: 'ok' | 'failed';
  signed_url?: string;
  failure_reason?: string;
}

export async function buildDiagramsSignedMap(
  diagramsMetadata: Record<string, DiagramsMetadataEntry> | null | undefined,
): Promise<Record<string, DiagramSignedEntry>> {
  const out: Record<string, DiagramSignedEntry> = {};
  if (!diagramsMetadata) return out;

  await Promise.all(
    Object.entries(diagramsMetadata).map(async ([solutionId, m]) => {
      if (!m) return;
      const entry: DiagramSignedEntry = {
        title: m.title,
        status: m.status,
      };
      if (m.status === 'failed' && m.failure_reason) {
        entry.failure_reason = m.failure_reason;
      }
      if (m.status === 'ok' && m.storage_path) {
        try {
          entry.signed_url = await getDiagramSignedUrl(m.storage_path);
        } catch (err) {
          console.warn(
            `[storage-diagrams] sign ${solutionId} failed: ${(err as Error).message}`,
          );
        }
      }
      out[solutionId] = entry;
    }),
  );

  return out;
}

export async function loadDiagramAssetsForAudit(
  diagramsMetadata: Record<string, DiagramsMetadataEntry> | null | undefined,
): Promise<Map<string, DiagramAsset>> {
  const result = new Map<string, DiagramAsset>();
  if (!diagramsMetadata) return result;

  const entries = Object.entries(diagramsMetadata).filter(
    ([, m]) => m?.status === 'ok' && m.storage_path,
  );

  await Promise.all(
    entries.map(async ([solutionId, m]) => {
      try {
        const buffer = await downloadDiagram(m.storage_path!);
        const mimeType: DiagramMimeType = m.storage_path!.endsWith('.jpg')
          ? 'image/jpeg'
          : 'image/png';
        result.set(solutionId, { buffer, mimeType, title: m.title });
      } catch (err) {
        console.warn(
          `[storage-diagrams] download ${solutionId} failed: ${(err as Error).message}`,
        );
      }
    }),
  );

  return result;
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
