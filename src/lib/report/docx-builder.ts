// Générateur DOCX du rapport d'audit 5PennyAi.
//
// Session 2D — Étape 2 : portage en TypeScript du script de référence
// `docs/references/build-report.js`. Reproduit fidèlement le rendu
// visuel du PDF Sophie (palette Navy/Orange/Cream, callouts, tableaux,
// header/footer, format Letter).
//
// Source des données :
//   - audit.intake_data         → page de titre, contexte
//   - audit.skill_1_output      → industry_vertical, business_profile
//   - audit.skill_2_output      → selected_opportunities (titres résolus)
//   - audit.skill_5_output      → tout le contenu rapport client
//   - audit.admin_notes_global  → conditionnelle de révision
//   - audit.reviewed_at         → conditionnelle de révision
//
// Le ton et la voix sont définis par le pipeline ; ce builder ne fait
// que la mise en page. Il ne réinvente rien.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
  type ITableCellOptions,
} from 'docx';

import type {
  ActionableDeliverable,
  ImpactEffortEntry,
  RoiEstimate,
  SelectedOpportunity,
  Skill1Output,
  Skill2Output,
  Skill5Output,
} from '../../types/skills';
import type { IntakeFormData } from '../../types/intake';
import { industryLabel } from '../labels/industry';

// ============================================================
// COULEURS — alignées sur DESIGN_SYSTEM.md (--color-* tokens)
// ============================================================
const NAVY = '0F2744';     // navy-600 — titres, accents
const ORANGE = 'F57D20';   // orange-500 — éléments saillants
const TEXT = '2E2E33';     // texte principal
const MUTED = '5B6B7E';    // texte secondaire
const SOFT_BG = 'FBF7F0';  // cream — callouts
const BORDER = 'E3E8EE';   // bordures fines

// ============================================================
// AUDIT — type d'entrée minimal accepté par le builder
// ============================================================

export interface AuditForDocx {
  id: string;
  intake_data: IntakeFormData | null;
  skill_1_output: Skill1Output | null;
  skill_2_output: Skill2Output | null;
  skill_5_output: Skill5Output | null;
  admin_notes_global?: string | null;
  reviewed_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
}

// Quelques constantes de garde-fou.
const MIN_BUFFER_BYTES = 20 * 1024;
const MAX_BUFFER_BYTES = 2 * 1024 * 1024;

// ============================================================
// HELPERS — paragraphes, listes, tableau, callout
// ============================================================

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const allBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function H1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, color: NAVY })],
    spacing: { before: 400, after: 200 },
  });
}

function H2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, color: NAVY })],
    spacing: { before: 300, after: 150 },
  });
}

function H3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, color: NAVY, bold: true })],
    spacing: { before: 200, after: 100 },
  });
}

interface ParagraphOpts {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  size?: number;
}

function P(text: string, opts: ParagraphOpts = {}): Paragraph {
  const { alignment, ...runOpts } = opts;
  return new Paragraph({
    children: [new TextRun({ text, color: runOpts.color ?? TEXT, ...runOpts })],
    spacing: { after: 120 },
    alignment: alignment ?? AlignmentType.JUSTIFIED,
  });
}

function PRich(
  runs: TextRun[],
  opts: { alignment?: ParagraphOpts['alignment']; spacingAfter?: number } = {},
): Paragraph {
  return new Paragraph({
    children: runs,
    spacing: { after: opts.spacingAfter ?? 120 },
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
  });
}

function Bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [new TextRun({ text, color: TEXT })],
    spacing: { after: 80 },
  });
}

function Numbered(text: string, level = 0): Paragraph {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    children: [new TextRun({ text, color: TEXT })],
    spacing: { after: 80 },
  });
}

function Spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } });
}

function HR(): Paragraph {
  return new Paragraph({
    children: [new TextRun('')],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 },
    },
    spacing: { before: 200, after: 200 },
  });
}

function PageBreakPara(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: '', break: 1 })] });
}

function HeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [new TextRun({ text, color: 'FFFFFF', bold: true, size: 20 })],
      }),
    ],
  });
}

interface CellOpts extends Pick<IRunOptions, 'bold' | 'italics'> {
  fill?: string;
  paragraphs?: Paragraph[];
}

function Cell(text: string | string[], width: number, opts: CellOpts = {}): TableCell {
  let children: Paragraph[];
  if (opts.paragraphs) {
    children = opts.paragraphs;
  } else {
    const lines = Array.isArray(text) ? text : [text];
    children = lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              color: TEXT,
              size: 20,
              bold: opts.bold,
              italics: opts.italics,
            }),
          ],
        }),
    );
  }

  const cellOpts: ITableCellOptions = {
    borders: allBorders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children,
    ...(opts.fill
      ? { shading: { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' } }
      : {}),
  };

  return new TableCell(cellOpts);
}

/**
 * Bandeau cream + bordure gauche orange épaisse, pour les sections sensibles
 * (résultat 12 mois, synthèse consolidée des gains, mot de clôture).
 */
function CalloutBox(label: string, contentParagraphs: Paragraph[]): Table {
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
              left: { style: BorderStyle.SINGLE, size: 16, color: ORANGE },
              right: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
            },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: SOFT_BG, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: label, color: ORANGE, bold: true, size: 18 }),
                ],
                spacing: { after: 80 },
              }),
              ...contentParagraphs,
            ],
          }),
        ],
      }),
    ],
  });
}

// ============================================================
// HELPERS DOMAINE — titres opportunités, dates, slugs, mappings
// ============================================================

const QUADRANT_LABELS: Record<string, string> = {
  quick_win: 'Quick wins',
  projet_strategique: 'Projets stratégiques',
  option_secondaire: 'Options secondaires',
  a_reconsiderer: 'À reconsidérer',
};

const PATH_LABELS: Record<string, string> = {
  voie_a_self_serve: 'Voie A — Self-serve',
  voie_b_accompagne: 'Voie B — Accompagné',
  voie_c_custom: 'Voie C — Custom',
  mixte: 'Voie mixte',
};

const PAYBACK_COLORS: Record<string, string> = {
  court: '10B981',  // success
  moyen: 'F59E0B',  // warning
  long: 'EF4444',   // danger
};

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function monthYear(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function slugify(input: string): string {
  return (input || 'client')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'client';
}

/**
 * Construit un map opportunity_id → titre résolu pour adoucir l'affichage.
 * Préfère adapted_title du Skill 2, retombe sur l'ID brut si absent.
 */
function buildOpportunityTitleMap(
  opportunities: SelectedOpportunity[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const opp of opportunities ?? []) {
    if (opp.pattern_id && opp.adapted_title) {
      map.set(opp.pattern_id, opp.adapted_title);
    }
  }
  return map;
}

function titleFor(id: string, titleMap: Map<string, string>): string {
  return titleMap.get(id) ?? id;
}

function clientDisplayName(intake: IntakeFormData | null): string {
  return intake?.business_name?.trim() || intake?.first_name?.trim() || 'Votre entreprise';
}

function clientSlug(intake: IntakeFormData | null): string {
  return slugify(intake?.business_name || intake?.first_name || 'client');
}

/**
 * Logique conditionnelle de l'affirmation de révision (Étape 6c) :
 * la phrase de révision n'apparaît que si l'audit a effectivement été
 * révisé ET que Christian a laissé une note globale (admin_notes_global).
 *
 * Pourquoi pas les reviewer_notes par section ? Le pipeline IA pré-remplit
 * skill_X_output.reviewer_notes (c'est un champ « note de l'IA pour le
 * réviseur humain », requis dans le schema). L'endpoint admin écrase
 * cette valeur quand l'admin édite une note. Impossible donc, sans ajouter
 * une colonne dédiée, de distinguer une note IA d'une note humaine au
 * niveau section. admin_notes_global est la seule preuve fiable d'une
 * intervention humaine.
 */
function shouldIncludeReviewStatement(audit: AuditForDocx): boolean {
  if (!audit.reviewed_at) return false;
  return !!audit.admin_notes_global?.trim();
}

/**
 * Filet de sécurité : retire les phrases du `closing_notes` qui
 * mentionnent une révision humaine. L'IA n'est plus censée en générer
 * (cf. system_prompt Skill 5 v2 mis à jour), mais les audits déjà en DB
 * en contiennent, et l'IA pourrait glisser une variante par erreur.
 *
 * Appliqué uniquement quand `includeReviewStatement === false`. Quand
 * la phrase est légitime, on laisse la prose IA telle quelle (et on
 * ajoute en plus la phrase explicite gérée par le builder).
 */
const REVIEW_MENTION_REGEX =
  /[^.!?]*(révis(?:é|ée|ion)\s+(?:humain|personnel|manuel)|relu(?:e)?\s+par|christian\s+couillard\s+a\s+(?:révis|relu|appliqu|valid)|révision\s+(?:humaine|manuelle)|relecture\s+par\s+christian)[^.!?]*[.!?]?/gi;

function stripReviewMentions(text: string): string {
  return text
    .replace(REVIEW_MENTION_REGEX, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// SECTIONS — ordre du PDF de référence Sophie
// ============================================================

function buildTitlePage(audit: AuditForDocx, includeReviewStatement: boolean): Paragraph[] {
  const businessName = clientDisplayName(audit.intake_data);
  const firstName = audit.intake_data?.first_name?.trim() ?? '';
  const dateLabel = monthYear(audit.delivered_at ?? audit.created_at);
  const industrySlug =
    audit.intake_data?.industry ??
    audit.skill_1_output?.business_profile?.industry_vertical ??
    null;
  const industryText =
    industrySlug === 'autre'
      ? audit.intake_data?.industry_other?.trim() || ''
      : industryLabel(industrySlug);

  const blocks: Paragraph[] = [
    Spacer(), Spacer(), Spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "RAPPORT D'AUDIT IA",
          color: ORANGE, bold: true, size: 24, allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({ text: businessName, color: NAVY, bold: true, size: 56 }),
      ],
    }),
  ];

  if (firstName) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({ text: `Préparé pour ${firstName}`, color: TEXT, size: 26 }),
        ],
      }),
    );
  }

  if (industryText) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({ text: industryText, color: MUTED, size: 22, italics: true }),
        ],
      }),
    );
  }

  if (dateLabel) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
        children: [
          new TextRun({ text: dateLabel, color: MUTED, italics: true, size: 24 }),
        ],
      }),
    );
  }

  blocks.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 120 },
      children: [new TextRun({ text: 'Produit par 5PennyAi', color: NAVY, bold: true, size: 24 })],
    }),
  );

  if (includeReviewStatement) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: 'Révisé par Christian Couillard',
            color: MUTED, italics: true, size: 22,
          }),
        ],
      }),
    );
  }

  blocks.push(PageBreakPara());
  return blocks;
}

function buildExecutiveSummary(skill5: Skill5Output): Array<Paragraph | Table> {
  const exec = skill5.executive_summary;
  const blocks: Array<Paragraph | Table> = [
    H1('Sommaire exécutif'),
  ];

  if (exec.opening_paragraph?.trim()) {
    blocks.push(P(exec.opening_paragraph.trim()));
  }

  if (exec.key_findings?.length) {
    blocks.push(H2('Constats clés'));
    for (const finding of exec.key_findings) {
      blocks.push(Bullet(finding));
    }
  }

  if (exec.top_3_recommendations?.length) {
    blocks.push(H2('Top 3 recommandations'));
    for (const reco of exec.top_3_recommendations) {
      blocks.push(Numbered(reco));
    }
  }

  return blocks;
}

function buildExpectedOutcome(skill5: Skill5Output): Array<Paragraph | Table> {
  const text = skill5.executive_summary?.expected_outcome_12_months?.trim();
  if (!text) return [];
  return [
    Spacer(),
    CalloutBox('RÉSULTAT ATTENDU À 12 MOIS', [
      new Paragraph({
        children: [new TextRun({ text, color: TEXT })],
        alignment: AlignmentType.JUSTIFIED,
      }),
    ]),
    Spacer(),
  ];
}

function buildImpactEffortMatrix(
  matrix: ImpactEffortEntry[] | undefined,
  titleMap: Map<string, string>,
): Array<Paragraph | Table> {
  if (!matrix?.length) return [];

  const blocks: Array<Paragraph | Table> = [H1('Matrice impact / effort')];

  // Regroupement par quadrant pour un affichage thématique.
  const byQuadrant = new Map<string, ImpactEffortEntry[]>();
  for (const entry of matrix) {
    const list = byQuadrant.get(entry.quadrant) ?? [];
    list.push(entry);
    byQuadrant.set(entry.quadrant, list);
  }

  // Tableau récap : quadrant | opportunité | impact | effort
  const COL_WIDTHS = [2400, 4800, 1080, 1080] as const;
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        HeaderCell('Quadrant', COL_WIDTHS[0]),
        HeaderCell('Opportunité', COL_WIDTHS[1]),
        HeaderCell('Impact', COL_WIDTHS[2]),
        HeaderCell('Effort', COL_WIDTHS[3]),
      ],
    }),
  ];

  const quadrantOrder = [
    'quick_win', 'projet_strategique', 'option_secondaire', 'a_reconsiderer',
  ];
  for (const q of quadrantOrder) {
    const entries = byQuadrant.get(q);
    if (!entries?.length) continue;
    for (const entry of entries) {
      rows.push(
        new TableRow({
          children: [
            Cell(QUADRANT_LABELS[q] ?? q, COL_WIDTHS[0], { bold: true }),
            Cell(titleFor(entry.opportunity_id, titleMap), COL_WIDTHS[1]),
            Cell(String(entry.impact_score ?? '—'), COL_WIDTHS[2]),
            Cell(String(entry.effort_score ?? '—'), COL_WIDTHS[3]),
          ],
        }),
      );
    }
  }

  blocks.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [...COL_WIDTHS],
      rows,
    }),
  );
  return blocks;
}

function buildRoadmap(
  roadmap: Skill5Output['roadmap'] | undefined,
  titleMap: Map<string, string>,
): Array<Paragraph | Table> {
  if (!roadmap) return [];

  const blocks: Array<Paragraph | Table> = [H1('Feuille de route')];

  const phases = [
    { num: 1, label: 'Quick wins', data: roadmap.phase_1_quick_wins },
    { num: 2, label: 'Moyen terme', data: roadmap.phase_2_medium_term },
    { num: 3, label: 'Long terme', data: roadmap.phase_3_long_term },
  ] as const;

  for (const { num, label, data } of phases) {
    if (!data) continue;
    const timeframe = data.timeframe ? ` — ${data.timeframe}` : '';
    blocks.push(H2(`${num}. Phase ${label}${timeframe}`));

    const opps = data.opportunities ?? [];
    if (opps.length) {
      blocks.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'OPPORTUNITÉS TRAITÉES', color: ORANGE,
              bold: true, size: 16, allCaps: true,
            }),
          ],
        }),
      );
      for (const id of opps) {
        blocks.push(Bullet(titleFor(id, titleMap)));
      }
    }

    const milestones = (data as { key_milestones?: string[] }).key_milestones ?? [];
    if (milestones.length) {
      blocks.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'ÉTAPES CLÉS', color: ORANGE,
              bold: true, size: 16, allCaps: true,
            }),
          ],
        }),
      );
      for (const ms of milestones) {
        blocks.push(Bullet(ms));
      }
    }

    const budget = (data as { estimated_budget_range_cad?: string }).estimated_budget_range_cad;
    if (budget) {
      blocks.push(
        PRich(
          [
            new TextRun({ text: 'BUDGET : ', color: NAVY, bold: true, size: 20 }),
            new TextRun({ text: budget, color: TEXT, size: 20 }),
          ],
          { alignment: AlignmentType.LEFT },
        ),
      );
    }

    const direction = (data as { strategic_direction?: string }).strategic_direction;
    if (direction) {
      blocks.push(
        PRich(
          [
            new TextRun({ text: 'DIRECTION STRATÉGIQUE : ', color: NAVY, bold: true, size: 20 }),
            new TextRun({ text: direction, color: TEXT, size: 20 }),
          ],
          { alignment: AlignmentType.LEFT },
        ),
      );
    }
  }

  return blocks;
}

function buildRoiEstimates(
  estimates: RoiEstimate[] | undefined,
  titleMap: Map<string, string>,
): Array<Paragraph | Table> {
  if (!estimates?.length) return [];

  const blocks: Array<Paragraph | Table> = [H1('Estimations ROI')];

  for (const est of estimates) {
    blocks.push(H2(titleFor(est.opportunity_id, titleMap)));

    if (est.time_saved_qualitative) {
      blocks.push(
        PRich(
          [
            new TextRun({ text: 'TEMPS GAGNÉ — ', color: ORANGE, bold: true, size: 18 }),
            new TextRun({ text: est.time_saved_qualitative, color: TEXT }),
          ],
          { alignment: AlignmentType.LEFT, spacingAfter: 80 },
        ),
      );
    }
    if (est.revenue_impact_qualitative) {
      blocks.push(
        PRich(
          [
            new TextRun({ text: 'IMPACT REVENUS — ', color: ORANGE, bold: true, size: 18 }),
            new TextRun({ text: est.revenue_impact_qualitative, color: TEXT }),
          ],
          { alignment: AlignmentType.LEFT, spacingAfter: 80 },
        ),
      );
    }
    if (est.payback_period_qualitative) {
      const payback = est.payback_period_qualitative.toLowerCase();
      const paybackColor =
        Object.entries(PAYBACK_COLORS).find(([k]) => payback.includes(k))?.[1] ?? TEXT;
      blocks.push(
        PRich(
          [
            new TextRun({ text: 'PAYBACK — ', color: ORANGE, bold: true, size: 18 }),
            new TextRun({ text: est.payback_period_qualitative, color: paybackColor, bold: true }),
          ],
          { alignment: AlignmentType.LEFT, spacingAfter: 80 },
        ),
      );
    }
    if (est.notes) {
      blocks.push(P(est.notes, { italics: true, color: MUTED, size: 20 }));
    }
  }

  return blocks;
}

function buildConsolidatedSummary(
  summary: Skill5Output['consolidated_impact_summary'] | undefined,
): Array<Paragraph | Table> {
  if (!summary) return [];

  const figures = summary.consolidated_figures ?? [];
  const cautions = summary.cautions ?? [];
  const total = summary.total_opportunities ?? figures.length;

  const labelText =
    total > 0
      ? `${total} OPPORTUNITÉ${total > 1 ? 'S' : ''} COMBINÉE${total > 1 ? 'S' : ''}`
      : 'SYNTHÈSE CONSOLIDÉE DES GAINS';

  const inner: Paragraph[] = [];

  if (summary.consolidation_method?.trim()) {
    inner.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Méthode de consolidation : ', color: NAVY, bold: true }),
          new TextRun({ text: summary.consolidation_method.trim(), color: TEXT }),
        ],
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
      }),
    );
  }

  for (const fig of figures) {
    inner.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `${fig.metric} `, color: NAVY, bold: true }),
          new TextRun({
            text: `(${fig.timeframe})`,
            color: MUTED, italics: true, size: 18,
          }),
        ],
      }),
    );
    inner.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `${fig.low_range} – ${fig.high_range} ${fig.unit}`,
            color: TEXT, bold: true, size: 24,
          }),
        ],
      }),
    );
    if (fig.overlap_note) {
      inner.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: fig.overlap_note, color: MUTED, italics: true, size: 18 }),
          ],
        }),
      );
    }
  }

  if (cautions.length) {
    inner.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({ text: 'Mises en garde', color: NAVY, bold: true, size: 20 }),
        ],
      }),
    );
    for (const c of cautions) {
      inner.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun({ text: c, color: TEXT })],
          spacing: { after: 60 },
        }),
      );
    }
  }

  return [Spacer(), CalloutBox(labelText, inner), Spacer()];
}

// ─────────── Livrables actionnables ───────────

function buildPromptsPack(content: Record<string, unknown>): Array<Paragraph | Table> {
  const prompts = Array.isArray(content.prompts)
    ? (content.prompts as Array<Record<string, unknown>>)
    : [];
  const blocks: Array<Paragraph | Table> = [];

  prompts.forEach((p, i) => {
    const title = typeof p.title === 'string' ? p.title : `Prompt ${i + 1}`;
    const useCase = typeof p.use_case === 'string' ? p.use_case : '';
    const promptText = typeof p.prompt_text === 'string' ? p.prompt_text : '';

    blocks.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({ text: `${i + 1}. ${title}`, color: NAVY, bold: true, size: 22 }),
        ],
      }),
    );
    if (useCase) {
      blocks.push(P(useCase, { italics: true, color: MUTED, size: 20 }));
    }
    if (promptText) {
      // Bloc « code » : encadré cream + bordure left orange (callout réutilisé)
      blocks.push(
        CalloutBox('PROMPT', [
          new Paragraph({
            children: [new TextRun({ text: promptText, color: TEXT, font: 'Calibri' })],
            alignment: AlignmentType.LEFT,
          }),
        ]),
      );
      blocks.push(Spacer());
    }
  });

  return blocks;
}

function buildLoi25Policy(content: Record<string, unknown>): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  const policy = typeof content.policy_text === 'string' ? content.policy_text : '';
  const customization = Array.isArray(content.customization_notes)
    ? (content.customization_notes as string[])
    : [];
  const checklist = Array.isArray(content.loi25_compliance_checklist)
    ? (content.loi25_compliance_checklist as Array<Record<string, unknown>>)
    : [];

  if (policy) {
    blocks.push(H3('Politique pré-remplie'));
    for (const para of policy.split(/\n{2,}/)) {
      if (para.trim()) blocks.push(P(para.trim()));
    }
  }

  if (customization.length) {
    blocks.push(H3('Zones à personnaliser'));
    for (const note of customization) blocks.push(Bullet(note));
  }

  if (checklist.length) {
    blocks.push(H3('Checklist de conformité'));
    const COLS = [4400, 1800, 3160] as const;
    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          HeaderCell('Obligation', COLS[0]),
          HeaderCell('Statut probable', COLS[1]),
          HeaderCell('Action suggérée', COLS[2]),
        ],
      }),
    ];
    for (const item of checklist) {
      rows.push(
        new TableRow({
          children: [
            Cell(String(item.obligation ?? ''), COLS[0]),
            Cell(String(item.statut_probable ?? ''), COLS[1]),
            Cell(String(item.action_suggeree ?? ''), COLS[2]),
          ],
        }),
      );
    }
    blocks.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [...COLS], rows }));
  }
  return blocks;
}

function buildVendorChecklist(content: Record<string, unknown>): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  const category = typeof content.vendor_category === 'string' ? content.vendor_category : '';
  const criteria = Array.isArray(content.evaluation_criteria) ? (content.evaluation_criteria as string[]) : [];
  const redFlags = Array.isArray(content.red_flags) ? (content.red_flags as string[]) : [];
  const demoQ = Array.isArray(content.questions_to_ask_in_demo) ? (content.questions_to_ask_in_demo as string[]) : [];

  if (category) blocks.push(P(`Catégorie : ${category}`, { bold: true }));
  if (criteria.length) {
    blocks.push(H3("Critères d'évaluation"));
    for (const c of criteria) blocks.push(Bullet(c));
  }
  if (redFlags.length) {
    blocks.push(H3("Signaux d'alerte"));
    for (const r of redFlags) blocks.push(Bullet(r));
  }
  if (demoQ.length) {
    blocks.push(H3('Questions à poser en démo'));
    for (const q of demoQ) blocks.push(Bullet(q));
  }
  return blocks;
}

function buildAutomationStarter(content: Record<string, unknown>): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  const name = typeof content.workflow_name === 'string' ? content.workflow_name : '';
  const tool = typeof content.tool_used === 'string' ? content.tool_used : '';
  const steps = Array.isArray(content.step_by_step) ? (content.step_by_step as Array<Record<string, unknown>>) : [];
  const gotchas = Array.isArray(content.common_gotchas) ? (content.common_gotchas as string[]) : [];

  if (name || tool) {
    blocks.push(P(`${name}${tool ? ` — ${tool}` : ''}`, { bold: true }));
  }
  if (steps.length) {
    blocks.push(H3('Pas-à-pas'));
    for (const s of steps) {
      const num = typeof s.step_number === 'number' ? s.step_number : '';
      const action = typeof s.action === 'string' ? s.action : '';
      const expect = typeof s.what_you_should_see === 'string' ? s.what_you_should_see : '';
      blocks.push(
        PRich([
          new TextRun({ text: `${num}. `, bold: true, color: NAVY }),
          new TextRun({ text: action, color: TEXT }),
        ], { alignment: AlignmentType.LEFT, spacingAfter: 40 }),
      );
      if (expect) {
        blocks.push(P(`Ce que vous devriez voir : ${expect}`, { italics: true, color: MUTED, size: 20 }));
      }
    }
  }
  if (gotchas.length) {
    blocks.push(H3('Pièges fréquents'));
    for (const g of gotchas) blocks.push(Bullet(g));
  }
  return blocks;
}

function buildKpiSheet(content: Record<string, unknown>): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  const kpis = Array.isArray(content.kpis) ? (content.kpis as Array<Record<string, unknown>>) : [];
  const cadence = typeof content.cadence === 'string' ? content.cadence : '';
  const reviewQ = Array.isArray(content.review_questions) ? (content.review_questions as string[]) : [];

  if (kpis.length) {
    const COLS = [3000, 2120, 2120, 2120] as const;
    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          HeaderCell('KPI', COLS[0]),
          HeaderCell('Référence actuelle', COLS[1]),
          HeaderCell('Cible 90 jours', COLS[2]),
          HeaderCell('Comment mesurer', COLS[3]),
        ],
      }),
    ];
    for (const k of kpis) {
      rows.push(
        new TableRow({
          children: [
            Cell(String(k.name ?? ''), COLS[0], { bold: true }),
            Cell(String(k.current_baseline_if_known ?? '—'), COLS[1]),
            Cell(String(k.target_after_90_days ?? '—'), COLS[2]),
            Cell(String(k.how_to_measure ?? ''), COLS[3]),
          ],
        }),
      );
    }
    blocks.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [...COLS], rows }));
  }
  if (cadence) {
    blocks.push(P(`Cadence de revue : ${cadence}`, { bold: true }));
  }
  if (reviewQ.length) {
    blocks.push(H3('Questions de revue périodique'));
    for (const q of reviewQ) blocks.push(Bullet(q));
  }
  return blocks;
}

function buildDeliverable(d: ActionableDeliverable): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [H2(d.title || 'Livrable')];

  if (d.rationale) {
    blocks.push(P(d.rationale, { italics: true, color: MUTED }));
  }

  switch (d.deliverable_type) {
    case 'ai_prompts_pack': blocks.push(...buildPromptsPack(d.content ?? {})); break;
    case 'loi_25_policy_template': blocks.push(...buildLoi25Policy(d.content ?? {})); break;
    case 'vendor_selection_checklist': blocks.push(...buildVendorChecklist(d.content ?? {})); break;
    case 'automation_starter_workflow': blocks.push(...buildAutomationStarter(d.content ?? {})); break;
    case 'kpi_tracking_sheet': blocks.push(...buildKpiSheet(d.content ?? {})); break;
    default:
      blocks.push(P("Type de livrable non reconnu — contenu omis."));
      break;
  }
  return blocks;
}

function buildActionableDeliverables(
  deliverables: ActionableDeliverable[] | undefined,
): Array<Paragraph | Table> {
  if (!deliverables?.length) return [];
  const blocks: Array<Paragraph | Table> = [H1(`Livrables actionnables (${deliverables.length})`)];
  for (const d of deliverables) {
    blocks.push(...buildDeliverable(d));
  }
  return blocks;
}

function buildRecommendedPath(
  rec: Skill5Output['recommended_path'] | undefined,
): Array<Paragraph | Table> {
  if (!rec) return [];
  const label = PATH_LABELS[rec.primary_path] ?? rec.primary_path;
  const blocks: Array<Paragraph | Table> = [
    H1('Voie recommandée'),
    H2(label),
  ];
  if (rec.rationale) blocks.push(P(rec.rationale));
  if (rec.alternative_consideration) {
    blocks.push(P(`Alternative : ${rec.alternative_consideration}`, { italics: true, color: MUTED }));
  }
  return blocks;
}

function buildClosingNotes(
  audit: AuditForDocx,
  includeReviewStatement: boolean,
): Array<Paragraph | Table> {
  const skill5 = audit.skill_5_output;
  if (!skill5) return [];

  const blocks: Array<Paragraph | Table> = [H1('Mot de clôture')];

  const rawClosing = skill5.closing_notes?.trim() ?? '';
  const closing = includeReviewStatement
    ? rawClosing
    : stripReviewMentions(rawClosing);
  if (closing) {
    for (const para of closing.split(/\n{2,}/)) {
      if (para.trim()) blocks.push(P(para.trim()));
    }
  }

  if (includeReviewStatement) {
    blocks.push(
      P(
        "Ce rapport a fait l'objet d'une révision humaine par Christian Couillard avant transmission.",
        { italics: true, color: MUTED },
      ),
    );
  }

  blocks.push(HR());
  blocks.push(
    P(
      includeReviewStatement
        ? 'Rapport produit et révisé par Christian Couillard · 5PennyAi · hello@5pennyai.com'
        : 'Rapport produit par 5PennyAi · hello@5pennyai.com',
      { alignment: AlignmentType.CENTER, color: MUTED, size: 18 },
    ),
  );

  if (skill5.confidence_level) {
    blocks.push(
      P(`Niveau de confiance global : ${skill5.confidence_level}`, {
        alignment: AlignmentType.CENTER, color: MUTED, italics: true, size: 18,
      }),
    );
  }

  return blocks;
}

// ============================================================
// CONSTRUCTION DU DOCUMENT
// ============================================================

export async function buildAuditDocx(audit: AuditForDocx): Promise<Buffer> {
  const skill5 = audit.skill_5_output;
  if (!skill5) {
    throw new Error(
      `Audit ${audit.id} sans skill_5_output : impossible de générer le DOCX.`,
    );
  }

  const titleMap = buildOpportunityTitleMap(audit.skill_2_output?.selected_opportunities);
  const includeReviewStatement = shouldIncludeReviewStatement(audit);

  const children: Array<Paragraph | Table> = [
    ...buildTitlePage(audit, includeReviewStatement),
    ...buildExecutiveSummary(skill5),
    ...buildExpectedOutcome(skill5),
    ...buildImpactEffortMatrix(skill5.impact_effort_matrix, titleMap),
    ...buildRoadmap(skill5.roadmap, titleMap),
    ...buildRoiEstimates(skill5.roi_estimates, titleMap),
    ...buildConsolidatedSummary(skill5.consolidated_impact_summary),
    ...buildActionableDeliverables(skill5.actionable_deliverables),
    ...buildRecommendedPath(skill5.recommended_path),
    ...buildClosingNotes(audit, includeReviewStatement),
  ];

  const businessName = clientDisplayName(audit.intake_data);

  const doc = new Document({
    creator: '5PennyAi',
    title: `Audit IA — ${businessName}`,
    description: "Rapport d'audit IA pour PME québécoise produit par 5PennyAi",

    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: TEXT } },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 40, bold: true, font: 'Calibri', color: NAVY },
          paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 30, bold: true, font: 'Calibri', color: NAVY },
          paragraph: { spacing: { before: 320, after: 180 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Calibri', color: NAVY },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
        },
      ],
    },

    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: 'numbers',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },

    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter (8.5" x 11")
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: '5PennyAi — Audit IA',
                  color: MUTED, size: 18, italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', color: MUTED, size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 18 }),
                new TextRun({ text: ' / ', color: MUTED, size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 18 }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  if (buffer.length < MIN_BUFFER_BYTES) {
    throw new Error(
      `DOCX généré trop petit (${buffer.length} octets < ${MIN_BUFFER_BYTES}). ` +
        `Probable contenu manquant pour l'audit ${audit.id}.`,
    );
  }
  if (buffer.length > MAX_BUFFER_BYTES) {
    throw new Error(
      `DOCX généré trop volumineux : ${buffer.length} octets (max ${MAX_BUFFER_BYTES}).`,
    );
  }

  return buffer;
}

/**
 * Slug client utilisable pour nommer le fichier (ex. pièce jointe).
 * Exposé pour que les endpoints n'aient pas à dupliquer la logique.
 */
export function clientFileSlug(audit: AuditForDocx): string {
  return clientSlug(audit.intake_data);
}
