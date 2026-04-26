// Rendu public du rapport d'audit, dédié à la livraison client.
// Distinct de ReportView (admin) : pas de metadata interne (confidence_level,
// "Skill 5", reviewer_notes), opportunités identifiées par leur titre adapté
// (pas le slug pattern_id), livrables actionnables développés intégralement.

import type { ReactNode } from 'react';

interface ExecutiveSummary {
  opening_paragraph?: string;
  key_findings?: string[];
  top_3_recommendations?: string[];
  expected_outcome_12_months?: string;
}

interface MatrixItem {
  opportunity_id?: string;
  impact_score?: number;
  effort_score?: number;
  quadrant?: string;
}

interface RoadmapPhase {
  timeframe?: string;
  opportunities?: string[];
  key_milestones?: string[];
  estimated_budget_range_cad?: string;
  strategic_direction?: string;
}

interface RoadmapShape {
  phase_1_quick_wins?: RoadmapPhase;
  phase_2_medium_term?: RoadmapPhase;
  phase_3_long_term?: RoadmapPhase;
}

interface RoiEstimate {
  opportunity_id?: string;
  time_saved_qualitative?: string;
  revenue_impact_qualitative?: string;
  payback_period_qualitative?: string;
  notes?: string;
}

interface ConsolidatedFigure {
  metric?: string;
  low_range?: string;
  high_range?: string;
  unit?: string;
  timeframe?: string;
  overlap_note?: string;
}

interface ConsolidatedSummary {
  total_opportunities?: number;
  consolidated_figures?: ConsolidatedFigure[];
  consolidation_method?: string;
  cautions?: string[];
}

interface Deliverable {
  deliverable_type?: string;
  title?: string;
  rationale?: string;
  content?: Record<string, unknown>;
}

interface RecommendedPath {
  primary_path?: string;
  rationale?: string;
  alternative_consideration?: string;
}

const QUADRANT_LABELS: Record<string, string> = {
  quick_win: 'Quick win',
  projet_strategique: 'Projet stratégique',
  option_secondaire: 'Option secondaire',
  a_reconsiderer: 'À reconsidérer',
};

const PAYBACK_LABELS: Record<string, string> = {
  court: 'Court — moins de 3 mois',
  moyen: 'Moyen — 3 à 6 mois',
  long: 'Long — 6 à 12 mois ou plus',
};

const PATH_LABELS: Record<string, string> = {
  voie_a_self_serve: 'Voie A — autonome',
  voie_b_accompagne: 'Voie B — accompagné',
  voie_c_custom: 'Voie C — sur mesure',
  mixte: 'Approche mixte',
};

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

interface PublicReportViewProps {
  data: unknown;
  /** Mapping pattern_id → adapted_title pour rendre les ids techniques lisibles. */
  opportunityTitles: Record<string, string>;
  /** Diagrammes signed URL par solution_id (= pattern_id). */
  diagrams?: Record<string, { title: string; signed_url: string }>;
}

export function PublicReportView({ data, opportunityTitles, diagrams }: PublicReportViewProps) {
  const obj = asObject(data);
  if (!obj) {
    return <p className="text-muted italic">Rapport indisponible.</p>;
  }

  const titleFor = (id?: string): string => {
    if (!id) return '';
    return opportunityTitles[id] ?? id;
  };

  const exec = asObject(obj.executive_summary) as ExecutiveSummary | null;
  const matrix = asArray<MatrixItem>(obj.impact_effort_matrix);
  const roadmap = asObject(obj.roadmap) as RoadmapShape | null;
  const roi = asArray<RoiEstimate>(obj.roi_estimates);
  const consolidated = asObject(obj.consolidated_impact_summary) as ConsolidatedSummary | null;
  const deliverables = asArray<Deliverable>(obj.actionable_deliverables);
  const recommended = asObject(obj.recommended_path) as RecommendedPath | null;
  const closing = asString(obj.closing_notes);

  return (
    <article className="flex flex-col gap-12 text-navy-600">
      {/* Sommaire exécutif */}
      {exec && (
        <Section title="Sommaire exécutif">
          {exec.opening_paragraph && (
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {exec.opening_paragraph}
            </p>
          )}
          {asArray<string>(exec.key_findings).length > 0 && (
            <Subsection title="Constats clés">
              <ul className="space-y-2 text-base leading-relaxed">
                {asArray<string>(exec.key_findings).map((f, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-orange-500 shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Subsection>
          )}
          {asArray<string>(exec.top_3_recommendations).length > 0 && (
            <Subsection title="Top 3 recommandations">
              <ol className="space-y-3 text-base leading-relaxed">
                {asArray<string>(exec.top_3_recommendations).map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </Subsection>
          )}
          {exec.expected_outcome_12_months && (
            <Callout title="Résultat attendu à 12 mois">
              {exec.expected_outcome_12_months}
            </Callout>
          )}
        </Section>
      )}

      {/* Matrice impact/effort */}
      {matrix.length > 0 && (
        <Section title="Matrice impact / effort">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matrix.map((m, i) => (
              <div key={i} className="flex flex-col gap-1.5 py-3 border-b border-line/60">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-base font-semibold text-navy-600">
                    {titleFor(m.opportunity_id)}
                  </h4>
                  {m.quadrant && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-orange-500 shrink-0">
                      {QUADRANT_LABELS[m.quadrant] ?? m.quadrant}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-muted">
                  {m.impact_score != null && (
                    <span>
                      Impact <strong className="text-navy-600 font-mono">{m.impact_score}/10</strong>
                    </span>
                  )}
                  {m.effort_score != null && (
                    <span>
                      Effort <strong className="text-navy-600 font-mono">{m.effort_score}/10</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Feuille de route */}
      {roadmap && (
        <Section title="Feuille de route">
          <div className="flex flex-col gap-6">
            <RoadmapPhaseBlock num={1} title="Quick wins" phase={roadmap.phase_1_quick_wins} titleFor={titleFor} diagrams={diagrams} />
            <RoadmapPhaseBlock num={2} title="Moyen terme" phase={roadmap.phase_2_medium_term} titleFor={titleFor} diagrams={diagrams} />
            <RoadmapPhaseBlock num={3} title="Long terme" phase={roadmap.phase_3_long_term} titleFor={titleFor} />
          </div>
        </Section>
      )}

      {/* ROI */}
      {roi.length > 0 && (
        <Section title="Estimations ROI">
          <div className="flex flex-col gap-5">
            {roi.map((r, i) => (
              <div key={i} className="border-l-2 border-orange-500 pl-4">
                <h4 className="text-base font-semibold text-navy-600 mb-2">
                  {titleFor(r.opportunity_id)}
                </h4>
                <dl className="space-y-1.5 text-sm leading-relaxed">
                  {r.time_saved_qualitative && (
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Temps gagné</dt>
                      <dd>{r.time_saved_qualitative}</dd>
                    </div>
                  )}
                  {r.revenue_impact_qualitative && (
                    <div className="pt-1">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Impact revenus</dt>
                      <dd>{r.revenue_impact_qualitative}</dd>
                    </div>
                  )}
                  {r.payback_period_qualitative && (
                    <div className="pt-1">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Payback</dt>
                      <dd>
                        {PAYBACK_LABELS[r.payback_period_qualitative] ?? r.payback_period_qualitative}
                      </dd>
                    </div>
                  )}
                  {r.notes && (
                    <div className="pt-2">
                      <dd className="text-sm text-muted italic">{r.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Synthèse consolidée */}
      {consolidated && asArray<ConsolidatedFigure>(consolidated.consolidated_figures).length > 0 && (
        <Section title="Synthèse consolidée des gains">
          <Callout title={`${consolidated.total_opportunities ?? '?'} opportunités combinées`}>
            <ul className="space-y-3">
              {asArray<ConsolidatedFigure>(consolidated.consolidated_figures).map((f, i) => (
                <li key={i}>
                  <p className="font-semibold">
                    {f.metric}
                    {' : '}
                    <span className="font-mono font-normal">
                      {f.low_range}
                      {f.high_range ? `–${f.high_range}` : ''}
                    </span>
                    {f.unit ? ` ${f.unit}` : ''}
                    {f.timeframe ? ` (${f.timeframe})` : ''}
                  </p>
                  {f.overlap_note && (
                    <p className="text-sm text-muted mt-1">{f.overlap_note}</p>
                  )}
                </li>
              ))}
            </ul>
            {consolidated.consolidation_method && (
              <p className="text-sm text-muted italic mt-4">
                <strong>Méthode :</strong> {consolidated.consolidation_method}
              </p>
            )}
            {asArray<string>(consolidated.cautions).length > 0 && (
              <ul className="list-disc list-outside ml-5 text-sm text-muted mt-3 space-y-1">
                {asArray<string>(consolidated.cautions).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </Callout>
        </Section>
      )}

      {/* Livrables actionnables */}
      {deliverables.length > 0 && (
        <Section title={`Livrables actionnables (${deliverables.length})`}>
          <div className="flex flex-col gap-8">
            {deliverables.map((d, i) => (
              <DeliverableBlock key={i} deliverable={d} />
            ))}
          </div>
        </Section>
      )}

      {/* Voie recommandée */}
      {recommended && (
        <Section title="Voie recommandée">
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold text-orange-500">
              {PATH_LABELS[recommended.primary_path ?? ''] ?? recommended.primary_path}
            </p>
            {recommended.rationale && (
              <p className="text-base leading-relaxed">{recommended.rationale}</p>
            )}
            {recommended.alternative_consideration && (
              <p className="text-sm text-muted leading-relaxed">
                <strong>Alternative :</strong> {recommended.alternative_consideration}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Notes de clôture */}
      {closing && (
        <Section title="Mot de clôture" subdued>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-navy-600">
            {closing}
          </p>
        </Section>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  subdued,
}: {
  title: string;
  children: ReactNode;
  subdued?: boolean;
}) {
  return (
    <section className="break-inside-avoid">
      <h2
        className={`font-mono text-[11px] font-semibold uppercase tracking-[0.12em] mb-4 ${
          subdued ? 'text-muted' : 'text-orange-500'
        }`}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-navy-600">{title}</h3>
      {children}
    </div>
  );
}

function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-orange-500 bg-cream/60 px-5 py-4 break-inside-avoid">
      {title && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-700 mb-2">
          {title}
        </p>
      )}
      <div className="text-base leading-relaxed text-navy-600">{children}</div>
    </div>
  );
}

function RoadmapPhaseBlock({
  num,
  title,
  phase,
  titleFor,
  diagrams,
}: {
  num: number;
  title: string;
  phase?: RoadmapPhase;
  titleFor: (id?: string) => string;
  diagrams?: Record<string, { title: string; signed_url: string }>;
}) {
  if (!phase) return null;
  const opportunities = asArray<string>(phase.opportunities);
  return (
    <div className="break-inside-avoid">
      <header className="flex items-baseline gap-3 mb-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-600 font-mono text-xs font-bold text-white">
          {num}
        </span>
        <h3 className="text-lg font-bold text-navy-600">{title}</h3>
        {phase.timeframe && (
          <span className="font-mono text-xs text-orange-500">— {phase.timeframe}</span>
        )}
      </header>
      <div className="ml-10 flex flex-col gap-3">
        {opportunities.length > 0 && (
          <p className="text-sm text-navy-600">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted block mb-1">
              Opportunités traitées
            </span>
            {opportunities.map((o) => titleFor(o)).join(' · ')}
          </p>
        )}
        {diagrams && opportunities.length > 0 && (
          <div className="flex flex-col gap-5 mt-2">
            {opportunities.map((solutionId) => {
              const d = diagrams[solutionId];
              if (!d) return null;
              return (
                <figure
                  key={solutionId}
                  className="flex flex-col items-center gap-2 break-inside-avoid"
                >
                  <img
                    src={d.signed_url}
                    alt={d.title}
                    className="w-full max-w-2xl rounded-lg border border-line bg-white"
                    loading="lazy"
                  />
                  <figcaption className="text-xs italic text-muted text-center">
                    {d.title}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
        {asArray<string>(phase.key_milestones).length > 0 && (
          <ul className="list-disc list-outside ml-5 text-sm leading-relaxed space-y-1">
            {asArray<string>(phase.key_milestones).map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        )}
        {phase.strategic_direction && (
          <p className="text-sm leading-relaxed italic text-navy-600">
            {phase.strategic_direction}
          </p>
        )}
        {phase.estimated_budget_range_cad && (
          <p className="text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mr-2">
              Budget
            </span>
            <span className="font-mono">{phase.estimated_budget_range_cad}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Renderers de livrables actionnables (par type)
// ─────────────────────────────────────────────────────────────

function DeliverableBlock({ deliverable }: { deliverable: Deliverable }) {
  const type = deliverable.deliverable_type ?? '';
  const content = deliverable.content ?? {};

  return (
    <div className="break-inside-avoid">
      <header className="border-b border-line pb-3 mb-4">
        <h3 className="text-lg font-bold text-navy-600">
          {deliverable.title ?? 'Livrable'}
        </h3>
        {deliverable.rationale && (
          <p className="text-sm text-muted mt-1 italic">{deliverable.rationale}</p>
        )}
      </header>
      <div className="text-sm leading-relaxed">
        {type === 'ai_prompts_pack' && <PromptsPackContent content={content} />}
        {type === 'loi_25_policy_template' && <Loi25Content content={content} />}
        {type === 'vendor_selection_checklist' && <VendorChecklistContent content={content} />}
        {type === 'automation_starter_workflow' && <WorkflowContent content={content} />}
        {type === 'kpi_tracking_sheet' && <KpiContent content={content} />}
        {!['ai_prompts_pack', 'loi_25_policy_template', 'vendor_selection_checklist', 'automation_starter_workflow', 'kpi_tracking_sheet'].includes(type) && (
          <pre className="overflow-x-auto rounded-lg bg-cream p-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function PromptsPackContent({ content }: { content: Record<string, unknown> }) {
  const prompts = asArray<Record<string, unknown>>(content.prompts);
  if (prompts.length === 0) {
    return <p className="text-muted italic">Aucun prompt disponible.</p>;
  }
  return (
    <ol className="flex flex-col gap-5">
      {prompts.map((p, i) => (
        <li key={i} className="break-inside-avoid">
          <header className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-xs text-orange-500 shrink-0">#{i + 1}</span>
            <h4 className="font-semibold text-navy-600">{asString(p.title)}</h4>
          </header>
          {Boolean(p.use_case) && (
            <p className="text-xs text-muted mb-2 ml-6">{asString(p.use_case)}</p>
          )}
          <pre className="ml-6 whitespace-pre-wrap rounded-lg border border-line bg-cream/60 p-3 font-mono text-[12px] leading-relaxed text-navy-600">
            {asString(p.prompt_text)}
          </pre>
        </li>
      ))}
    </ol>
  );
}

function Loi25Content({ content }: { content: Record<string, unknown> }) {
  const policy = asString(content.policy_text);
  const customNotes = asArray<string>(content.customization_notes);
  const checklist = asArray<Record<string, unknown>>(content.loi25_compliance_checklist);
  return (
    <div className="flex flex-col gap-5">
      {policy && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">Politique pré-remplie</h4>
          <div className="rounded-lg border border-line bg-cream/60 p-4 whitespace-pre-wrap leading-relaxed">
            {policy}
          </div>
        </div>
      )}
      {customNotes.length > 0 && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">Zones à personnaliser</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {customNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {checklist.length > 0 && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">Liste de conformité</h4>
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li key={i} className="rounded-lg border border-line bg-cream/40 p-3">
                <p className="font-medium text-navy-600">{asString(item.obligation)}</p>
                {Boolean(item.statut_probable) && (
                  <p className="text-xs text-muted mt-0.5">
                    Statut probable : <strong>{asString(item.statut_probable)}</strong>
                  </p>
                )}
                {Boolean(item.action_suggeree) && (
                  <p className="text-sm mt-1">{asString(item.action_suggeree)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VendorChecklistContent({ content }: { content: Record<string, unknown> }) {
  const cat = asString(content.vendor_category);
  const criteria = asArray<string>(content.evaluation_criteria);
  const redFlags = asArray<string>(content.red_flags);
  const demoQuestions = asArray<string>(content.questions_to_ask_in_demo);
  return (
    <div className="flex flex-col gap-5">
      {cat && (
        <p className="text-base">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mr-2">
            Catégorie
          </span>
          {cat}
        </p>
      )}
      {criteria.length > 0 && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">Critères d'évaluation</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {criteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {redFlags.length > 0 && (
        <div>
          <h4 className="font-semibold text-danger mb-2">Signaux d'alerte</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {redFlags.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {demoQuestions.length > 0 && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">À poser en démo</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {demoQuestions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function WorkflowContent({ content }: { content: Record<string, unknown> }) {
  const name = asString(content.workflow_name);
  const tool = asString(content.tool_used);
  const steps = asArray<Record<string, unknown>>(content.step_by_step);
  const gotchas = asArray<string>(content.common_gotchas);
  return (
    <div className="flex flex-col gap-5">
      {(name || tool) && (
        <p className="text-base">
          {name && <span className="font-semibold">{name}</span>}
          {name && tool && ' · '}
          {tool && <span className="text-muted">avec {tool}</span>}
        </p>
      )}
      {steps.length > 0 && (
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-600 text-white text-xs font-bold">
                {asString(s.step_number, String(i + 1))}
              </span>
              <div>
                <p className="font-medium">{asString(s.action)}</p>
                {Boolean(s.what_you_should_see) && (
                  <p className="text-sm text-muted mt-0.5">→ {asString(s.what_you_should_see)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {gotchas.length > 0 && (
        <div>
          <h4 className="font-semibold text-warning mb-2">Pièges fréquents</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {gotchas.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiContent({ content }: { content: Record<string, unknown> }) {
  const kpis = asArray<Record<string, unknown>>(content.kpis);
  const cadence = asString(content.cadence);
  const reviewQuestions = asArray<string>(content.review_questions);
  return (
    <div className="flex flex-col gap-5">
      {kpis.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line">
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">KPI</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Baseline</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Cible 90 j</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Mesure</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => (
                <tr key={i} className="border-b border-line/60 last:border-b-0 align-top">
                  <td className="py-2 pr-3 font-medium">{asString(k.name)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {asString(k.current_baseline_if_known) || '—'}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {asString(k.target_after_90_days) || '—'}
                  </td>
                  <td className="py-2 pr-3 text-muted">{asString(k.how_to_measure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cadence && (
        <p className="text-sm text-muted">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] mr-2">Cadence</span>
          {cadence}
        </p>
      )}
      {reviewQuestions.length > 0 && (
        <div>
          <h4 className="font-semibold text-navy-600 mb-2">Questions de revue</h4>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {reviewQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PublicReportView;
