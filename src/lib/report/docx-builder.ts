// Générateur DOCX du rapport d'audit 5PennyAi.
//
// Session 2D — Étape 1 : squelette uniquement. Étape 2 : portage du
// script de référence `docs/references/build-report.js` en TypeScript
// avec accès dynamique aux outputs des skills.
//
// Le builder reproduit fidèlement le rendu visuel du PDF de référence
// Sophie Tremblay (palette Navy/Orange/Cream, callouts, tableaux,
// header/footer, format Letter). Il ne doit pas innover sur le design.

import { Document, Packer, Paragraph, TextRun } from 'docx';

// Type minimal pour l'audit consommé par le builder. Élargi à l'Étape 2
// quand on accédera aux outputs réels des skills.
export interface AuditForDocx {
  id: string;
  intake_data?: Record<string, unknown> | null;
  report_output?: Record<string, unknown> | null;
  reviewed_at?: string | null;
  admin_notes_global?: string | null;
}

const MIN_BUFFER_BYTES = 20 * 1024;       // 20 Ko : un DOCX vide réel pèse plus
const MAX_BUFFER_BYTES = 2 * 1024 * 1024; // 2 Mo : seuil d'alerte

/**
 * Construit le rapport DOCX à partir d'un audit complet.
 * Retourne le buffer prêt à uploader dans Supabase Storage ou à
 * joindre à un courriel.
 */
export async function buildAuditDocx(audit: AuditForDocx): Promise<Buffer> {
  // Squelette : un document minimal valide. Remplacé à l'Étape 2
  // par la structure complète (page de titre, sommaire, matrice
  // impact/effort, feuille de route, ROI, livrables, etc.).
  const doc = new Document({
    creator: '5PennyAi',
    title: 'Audit IA',
    description: "Rapport d'audit IA pour PME québécoise produit par 5PennyAi",
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Audit ${audit.id} — squelette` })],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Le seuil min est désactivé pour le squelette (un doc minimal pèse
  // ~5 Ko). Réactivé à l'Étape 2 quand le contenu complet sera là.
  if (buffer.length > MAX_BUFFER_BYTES) {
    throw new Error(
      `DOCX généré trop volumineux : ${buffer.length} octets (max ${MAX_BUFFER_BYTES}).`,
    );
  }
  void MIN_BUFFER_BYTES;

  return buffer;
}
