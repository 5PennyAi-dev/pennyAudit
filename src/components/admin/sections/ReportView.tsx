import { useState } from 'react';
import {
  SectionShell,
  Subsection,
  ConfidenceBadge,
  HighlightCallout,
  ScoreBubble,
  EmptyHint,
  asArray,
  asObject,
  asString,
  pathLabel,
} from './_shared';
import { cn } from '../../../lib/utils';

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

const QUADRANT_LABELS: Record<string, { label: string; cls: string }> = {
  quick_win: { label: 'Quick win', cls: 'bg-success-bg text-success border-success/40' },
  projet_strategique: { label: 'Projet stratégique', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  option_secondaire: { label: 'Option secondaire', cls: 'bg-navy-50 text-navy-600 border-navy-100' },
  a_reconsiderer: { label: 'À reconsidérer', cls: 'bg-danger-bg text-danger border-danger/40' },
};

const PAYBACK_LABELS: Record<string, string> = {
  court: 'Court (< 3 mois)',
  moyen: 'Moyen (3-6 mois)',
  long: 'Long (6-12+ mois)',
};

const DELIVERABLE_LABELS: Record<string, string> = {
  ai_prompts_pack: 'Banque de prompts IA',
  loi_25_policy_template: 'Politique Loi 25',
  vendor_selection_checklist: 'Grille d\'évaluation fournisseur',
  automation_starter_workflow: 'Workflow d\'automatisation',
  kpi_tracking_sheet: 'Tableau de suivi KPI',
};

export function ReportView({ data }: { data: unknown }) {
  const obj = asObject(data);
  if (!obj) {
    return (
      <SectionShell title="Rapport final" subtitle="Output du Skill 5">
        <EmptyHint>Output du Skill 5 indisponible.</EmptyHint>
      </SectionShell>
    );
  }

  const exec = asObject(obj.executive_summary) as ExecutiveSummary | null;
  const matrix = asArray<MatrixItem>(obj.impact_effort_matrix);
  const roadmap = asObject(obj.roadmap) as RoadmapShape | null;
  const roi = asArray<RoiEstimate>(obj.roi_estimates);
  const consolidated = asObject(obj.consolidated_impact_summary) as ConsolidatedSummary | null;
  const deliverables = asArray<Deliverable>(obj.actionable_deliverables);
  const recommended = asObject(obj.recommended_path) as RecommendedPath | null;
  const closing = asString(obj.closing_notes);

  return (
    <SectionShell
      title="Rapport final"
      subtitle="Synthèse, ROI et feuille de route (Skill 5)"
      meta={<ConfidenceBadge level={asString(obj.confidence_level)} />}
    >
      {/* Sommaire exécutif */}
      {exec && (
        <Subsection title="Sommaire exécutif">
          {exec.opening_paragraph && (
            <p className="text-sm text-navy-600 whitespace-pre-wrap leading-relaxed">
              {exec.opening_paragraph}
            </p>
          )}
          {asArray<string>(exec.key_findings).length > 0 && (
            <div>
              <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                Constats clés
              </h6>
              <ul className="list-disc list-inside text-sm text-navy-600 space-y-0.5">
                {asArray<string>(exec.key_findings).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {asArray<string>(exec.top_3_recommendations).length > 0 && (
            <div>
              <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                Top 3 recommandations
              </h6>
              <ol className="list-decimal list-inside text-sm text-navy-600 space-y-1">
                {asArray<string>(exec.top_3_recommendations).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}
          {exec.expected_outcome_12_months && (
            <HighlightCallout title="Résultat attendu à 12 mois">
              {exec.expected_outcome_12_months}
            </HighlightCallout>
          )}
        </Subsection>
      )}

      {/* Matrice impact/effort */}
      {matrix.length > 0 && (
        <Subsection title="Matrice impact / effort">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {matrix.map((m, i) => {
              const q = m.quadrant ?? '';
              const entry = QUADRANT_LABELS[q];
              return (
                <div
                  key={m.opportunity_id ?? i}
                  className="rounded-lg border border-line bg-paper p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-navy-600">
                      {m.opportunity_id ?? '—'}
                    </span>
                    {entry && (
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
                          entry.cls,
                        )}
                      >
                        {entry.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {m.impact_score != null && (
                      <ScoreBubble label="Impact" value={m.impact_score} tone="orange" />
                    )}
                    {m.effort_score != null && (
                      <ScoreBubble label="Effort" value={m.effort_score} tone="navy" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Subsection>
      )}

      {/* Roadmap */}
      {roadmap && (
        <Subsection title="Feuille de route">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RoadmapPhaseCard
              num={1}
              title="Quick wins"
              phase={roadmap.phase_1_quick_wins}
            />
            <RoadmapPhaseCard
              num={2}
              title="Moyen terme"
              phase={roadmap.phase_2_medium_term}
            />
            <RoadmapPhaseCard
              num={3}
              title="Long terme"
              phase={roadmap.phase_3_long_term}
            />
          </div>
        </Subsection>
      )}

      {/* ROI estimates */}
      {roi.length > 0 && (
        <Subsection title="Estimations ROI">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Opportunité</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Temps gagné</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Impact revenus</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Payback</th>
                </tr>
              </thead>
              <tbody>
                {roi.map((r, i) => (
                  <tr key={i} className="border-b border-line/50 last:border-b-0 align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-navy-600">{r.opportunity_id ?? '—'}</td>
                    <td className="py-2 pr-3 text-navy-600">{r.time_saved_qualitative ?? '—'}</td>
                    <td className="py-2 pr-3 text-navy-600">{r.revenue_impact_qualitative ?? '—'}</td>
                    <td className="py-2 pr-3 text-navy-600">
                      {r.payback_period_qualitative
                        ? PAYBACK_LABELS[r.payback_period_qualitative] ?? r.payback_period_qualitative
                        : '—'}
                      {r.notes && (
                        <p className="text-xs text-muted mt-0.5">{r.notes}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Subsection>
      )}

      {/* Synthèse consolidée — sensible, highlight cream */}
      {consolidated && (
        <Subsection title="Synthèse consolidée des gains">
          <HighlightCallout
            title={`${consolidated.total_opportunities ?? '?'} opportunités combinées — méthode prudente`}
          >
            {asArray<ConsolidatedFigure>(consolidated.consolidated_figures).length === 0 ? (
              <p className="italic text-muted">
                Pas de consolidation chiffrée disponible.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {asArray<ConsolidatedFigure>(consolidated.consolidated_figures).map((f, i) => (
                  <li key={i} className="border-l-2 border-orange-500 pl-3">
                    <p>
                      <strong>{f.metric ?? '—'}</strong> :
                      <span className="font-mono ml-1">
                        {f.low_range}{f.high_range ? `–${f.high_range}` : ''}
                      </span>
                      {f.unit ? ` ${f.unit}` : ''}
                      {f.timeframe ? ` (${f.timeframe})` : ''}
                    </p>
                    {f.overlap_note && (
                      <p className="text-xs text-muted mt-1">{f.overlap_note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {consolidated.consolidation_method && (
              <p className="text-xs text-muted mt-3 italic">
                Méthode : {consolidated.consolidation_method}
              </p>
            )}
            {asArray<string>(consolidated.cautions).length > 0 && (
              <ul className="list-disc list-inside text-xs text-muted mt-2 space-y-0.5">
                {asArray<string>(consolidated.cautions).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </HighlightCallout>
        </Subsection>
      )}

      {/* Livrables actionnables */}
      {deliverables.length > 0 && (
        <Subsection title={`Livrables actionnables (${deliverables.length})`}>
          <div className="flex flex-col gap-2">
            {deliverables.map((d, i) => (
              <DeliverableCard key={i} deliverable={d} />
            ))}
          </div>
        </Subsection>
      )}

      {/* Voie recommandée */}
      {recommended && (
        <Subsection title="Voie recommandée">
          <div className="rounded-lg border border-line bg-cream/40 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 px-3 items-center rounded-full bg-orange-500 text-white font-semibold text-xs">
                {pathLabel(recommended.primary_path)}
              </span>
            </div>
            {recommended.rationale && (
              <p className="text-sm text-navy-600">{recommended.rationale}</p>
            )}
            {recommended.alternative_consideration && (
              <p className="text-xs text-muted">
                Alternative : {recommended.alternative_consideration}
              </p>
            )}
          </div>
        </Subsection>
      )}

      {/* Notes de clôture */}
      {closing && (
        <Subsection title="Notes de clôture">
          <p className="text-sm text-navy-600 whitespace-pre-wrap leading-relaxed">
            {closing}
          </p>
        </Subsection>
      )}
    </SectionShell>
  );
}

function RoadmapPhaseCard({
  num,
  title,
  phase,
}: {
  num: number;
  title: string;
  phase?: RoadmapPhase;
}) {
  if (!phase) return null;
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 flex flex-col gap-2">
      <header className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy-600 font-mono text-xs font-bold text-white">
          {num}
        </span>
        <h6 className="font-bold text-navy-600">{title}</h6>
      </header>
      {phase.timeframe && (
        <p className="font-mono text-xs text-orange-500">{phase.timeframe}</p>
      )}
      {asArray<string>(phase.opportunities).length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">Opportunités</p>
          <ul className="flex flex-wrap gap-1">
            {asArray<string>(phase.opportunities).map((o, i) => (
              <li key={i} className="font-mono text-[10px] rounded-full border border-line bg-cream px-2 py-0.5 text-navy-600">
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}
      {asArray<string>(phase.key_milestones).length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">Jalons</p>
          <ul className="list-disc list-inside text-xs text-navy-600 space-y-0.5">
            {asArray<string>(phase.key_milestones).map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
      )}
      {phase.estimated_budget_range_cad && (
        <p className="text-xs text-muted">
          Budget : <span className="font-mono text-navy-600">{phase.estimated_budget_range_cad}</span>
        </p>
      )}
      {phase.strategic_direction && (
        <p className="text-xs text-navy-600 italic mt-1">{phase.strategic_direction}</p>
      )}
    </div>
  );
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const [open, setOpen] = useState(false);
  const typeLabel = DELIVERABLE_LABELS[deliverable.deliverable_type ?? ''] ?? deliverable.deliverable_type ?? 'Livrable';
  return (
    <div className="rounded-lg border border-line bg-paper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-3 text-left hover:bg-cream/40"
      >
        <div className="flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-orange-500">
            {typeLabel}
          </span>
          <p className="font-medium text-navy-600 mt-0.5">{deliverable.title ?? 'Sans titre'}</p>
          {deliverable.rationale && (
            <p className="text-xs text-muted mt-1">{deliverable.rationale}</p>
          )}
        </div>
        <span className="font-mono text-xs text-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open && deliverable.content && (
        <div className="border-t border-line p-3">
          <pre className="overflow-x-auto rounded-lg bg-cream p-3 font-mono text-[11px] leading-relaxed text-navy-600">
            {JSON.stringify(deliverable.content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ReportView;
