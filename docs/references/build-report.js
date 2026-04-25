/**
 * build-report.js — Script de référence pour la génération DOCX 5PennyAi
 *
 * Ce fichier est la RÉFÉRENCE TECHNIQUE produite manuellement le 25 avril 2026
 * pendant les sessions de génération des rapports Sophie Tremblay et Marc Dubois.
 *
 * Il documente :
 *   - les couleurs et tokens à respecter
 *   - les helpers H1/H2/H3, P, Bullet, Numbered, HR, Spacer
 *   - les patterns de tableau (HeaderCell + Cell)
 *   - le pattern CalloutBox cream + bordure orange (sections sensibles)
 *   - la configuration Document (styles, numbering, page, header, footer)
 *
 * UTILISATION POUR LA SESSION 2D :
 *   - Porter ces helpers en TypeScript dans src/lib/report/docx-builder.ts
 *   - Remplacer les valeurs hardcodées par des accès dynamiques aux outputs
 *     de l'audit (audit.report_output.executive_summary, etc.)
 *   - Conserver fidèlement la palette, les marges, les styles
 *   - Ne PAS innover : reproduire le rendu visuel du PDF de référence Sophie
 *
 * Le contenu hardcodé Sophie/Marc qui était dans la version originale
 * a été retiré ici — il est remplacé par des commentaires expliquant
 * QUELS champs des outputs alimenter chaque section.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, Footer, Header
} = require('docx');
const fs = require('fs');

// ============================================================
// COULEURS — Identité 5PennyAi (à synchroniser avec DESIGN_SYSTEM.md)
// ============================================================
// Note historique : le script original utilisait "1A2540" pour Navy et
// "F0633C" pour Orange. Le design system officiel est "0F2744" (Navy 600)
// et "F57D20" (Orange 500). Pour la 2D, ALIGNER sur le design system.
const NAVY = "0F2744";       // Navy 600 — titres, accents
const ORANGE = "F57D20";     // Orange 500 — éléments saillants
const TEXT = "2E2E33";       // Texte principal
const MUTED = "5B6B7E";      // Texte secondaire (--color-muted du design system)
const SOFT_BG = "FBF7F0";    // Fond doux pour callouts (--color-cream)
const BORDER = "E3E8EE";     // Bordures de tableau (--color-line)

// ============================================================
// HELPERS — Constructeurs réutilisables
// ============================================================
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, color: NAVY })],
    spacing: { before: 400, after: 200 }
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, color: NAVY })],
    spacing: { before: 300, after: 150 }
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, color: NAVY, bold: true })],
    spacing: { before: 200, after: 100 }
  });
}

function P(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, color: TEXT, ...opts })],
    spacing: { after: 120 },
    alignment: opts.alignment || AlignmentType.JUSTIFIED
  });
}

function PRich(runs, opts = {}) {
  return new Paragraph({
    children: runs,
    spacing: { after: 120 },
    alignment: opts.alignment || AlignmentType.JUSTIFIED
  });
}

function Bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, color: TEXT })],
    spacing: { after: 80 }
  });
}

function BulletRich(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: runs,
    spacing: { after: 80 }
  });
}

function Numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    children: [new TextRun({ text, color: TEXT })],
    spacing: { after: 80 }
  });
}

function Spacer() {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } });
}

function HR() {
  return new Paragraph({
    children: [new TextRun("")],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
    spacing: { before: 200, after: 200 }
  });
}

// Cellule de tableau header (fond Navy, texte blanc)
function HeaderCell(text, width) {
  return new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, color: "FFFFFF", bold: true, size: 20 })]
    })]
  });
}

// Cellule de tableau standard
function Cell(text, width, opts = {}) {
  const runs = Array.isArray(text)
    ? text.map(t => new TextRun({ text: t, color: TEXT, size: 20, ...opts }))
    : [new TextRun({ text, color: TEXT, size: 20, ...opts })];

  return new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: runs })]
  });
}

// Bandeau de section (callout cream + bordure gauche orange épaisse)
// Utilisé pour : Synthèse consolidée des gains, Mot de clôture, sections sensibles
function CalloutBox(label, content) {
  const contentParagraphs = Array.isArray(content)
    ? content.map(c => typeof c === "string"
        ? new Paragraph({ children: [new TextRun({ text: c, color: TEXT })], spacing: { after: 100 } })
        : c)
    : [new Paragraph({ children: [new TextRun({ text: content, color: TEXT })] })];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
              left: { style: BorderStyle.SINGLE, size: 16, color: ORANGE },  // bordure gauche épaisse
              right: { style: BorderStyle.SINGLE, size: 4, color: ORANGE }
            },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: SOFT_BG, type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, color: ORANGE, bold: true, size: 18 })],
                spacing: { after: 80 }
              }),
              ...contentParagraphs
            ]
          })
        ]
      })
    ]
  });
}

// ============================================================
// CONSTRUCTION DU CONTENU — STRUCTURE À REPRODUIRE
// ============================================================
//
// Pour la 2D, le tableau children[] est rempli dynamiquement à partir
// de l'audit. Voici la structure à reproduire, dans l'ordre :
//
//   1. PAGE DE TITRE
//      - "RAPPORT D'AUDIT IA" (Orange, allCaps, size 24)
//      - Nom du business (Navy, bold, size 56)
//      - "Préparé pour [prénom + nom]" (TEXT, size 26)
//      - Mois + année (MUTED, italic, size 24)
//      - "Produit par 5PennyAi" (NAVY, bold, size 24)
//      - "Révisé par Christian Couillard" (MUTED, italic, size 22)
//        ↳ N.B. : appliquer la logique conditionnelle de l'Étape 6c (cf. instructions 2D)
//      - PageBreak
//
//   2. SOMMAIRE EXÉCUTIF
//      - H1 "Sommaire exécutif"
//      - P narratif depuis report_output.executive_summary.opening_paragraph
//      - H2 "Constats clés" puis bullets depuis executive_summary.key_findings
//      - H2 "Top 3 recommandations" puis Numbered depuis executive_summary.top_3_recommendations
//
//   3. RÉSULTAT ATTENDU À 12 MOIS
//      - CalloutBox label="RÉSULTAT ATTENDU À 12 MOIS"
//        content = report_output.executive_summary.expected_outcome_12_months
//
//   4. MATRICE IMPACT / EFFORT
//      - H1 "Matrice impact / effort"
//      - Tableau 2x2 (quick wins / projets stratégiques / options secondaires / à éviter)
//        depuis report_output.impact_effort_matrix
//
//   5. FEUILLE DE ROUTE
//      - H1 "Feuille de route"
//      - Pour chaque phase de report_output.roadmap (3 phases) :
//        - H2 "1. Phase Quick wins — 0-3 mois" (numéroté)
//        - Sous-titre "OPPORTUNITÉS TRAITÉES" (ORANGE small caps)
//        - Bullets des opportunités
//        - Bullets des étapes (semaine 1-2, semaine 3, etc.)
//        - Ligne BUDGET en bold
//
//   6. ESTIMATIONS ROI
//      - H1 "Estimations ROI"
//      - Pour chaque opportunité dans report_output.roi_estimates :
//        - H2 nom de l'opportunité
//        - Ligne "TEMPS GAGNÉ" + texte
//        - Ligne "IMPACT REVENUS" + texte
//        - Ligne "PAYBACK" + texte (avec couleur selon court/moyen/long)
//
//   7. SYNTHÈSE CONSOLIDÉE DES GAINS  ← SECTION SENSIBLE
//      - CalloutBox label="N OPPORTUNITÉS COMBINÉES"
//        content = report_output.consolidated_impact_summary
//        (paragraphes de méthode + hypothèses + caveats)
//
//   8. LIVRABLES ACTIONNABLES
//      - H1 "Livrables actionnables (N)"
//      - Pour chaque livrable dans report_output.actionable_deliverables :
//        - H2 titre du livrable
//        - P contexte
//        - Selon le type :
//          * banque de prompts → liste numérotée avec format spécifique
//            (titre du prompt en NAVY bold, description en italique MUTED, prompt en bloc encadré)
//          * politique Loi 25 → texte structuré numéroté
//          * tableau de bord KPI → vrai tableau docx avec colonnes
//
//   9. VOIE RECOMMANDÉE
//      - H1 "Voie recommandée"
//      - H2 "Voie X — [titre]" depuis recommended_path
//      - P justification
//      - P alternative en italique
//
//   10. MOT DE CLÔTURE
//       - H1 "Mot de clôture"
//       - P narratif depuis report_output.closing_notes
//       - Phrase de révision conditionnelle (Étape 6c)
//       - Ligne signature : "Rapport produit et révisé par Christian Couillard ·
//         5PennyAi · hello@5pennyai.com"
//       - HR
//       - Niveau de confiance global (italique MUTED, centré)
//
// ============================================================

// ============================================================
// CONSTRUCTION DU DOCUMENT (configuration Document)
// ============================================================
//
// Cette section est LA partie la plus importante à porter fidèlement.
// Elle définit les styles de paragraphe, les listes numérotées, et
// la mise en page (marges, header, footer, taille Letter).

const children = []; // ← rempli dynamiquement, voir structure ci-dessus

const doc = new Document({
  creator: "5PennyAi",
  title: "Audit IA — [nom du client]",  // ← dynamique depuis intake_data
  description: "Rapport d'audit IA pour PME québécoise produit par 5PennyAi",

  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: TEXT } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 40, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 320, after: 180 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      }
    ]
  },

  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },

  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },           // US Letter (8.5" x 11")
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }  // 1" partout
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: "5PennyAi — Audit IA",
              color: MUTED, size: 18, italics: true
            })]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", color: MUTED, size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 18 }),
              new TextRun({ text: " / ", color: MUTED, size: 18 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 18 })
            ]
          })
        ]
      })
    },
    children: children
  }]
});

// ============================================================
// EXPORT
// ============================================================
// Pour la 2D, ne PAS écrire sur le disque — retourner le buffer pour
// l'uploader dans Supabase Storage. Cette section sera remplacée par :
//
//   export async function buildAuditDocx(audit: Audit): Promise<Buffer> {
//     const doc = new Document({ ... });  // construit avec les outputs de audit
//     return await Packer.toBuffer(doc);
//   }

Packer.toBuffer(doc).then(buffer => {
  const path = "/home/claude/audit-test.docx";
  fs.writeFileSync(path, buffer);
  console.log(`✅ Document créé : ${path}`);
  console.log(`   Taille : ${(buffer.length / 1024).toFixed(1)} Ko`);
}).catch(err => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
