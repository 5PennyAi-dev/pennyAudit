import {
  SectionShell,
  Subsection,
  ConfidenceBadge,
  PatternSourceList,
  HighlightCallout,
  EmptyHint,
  asArray,
  asObject,
  asString,
  pathLabel,
} from './_shared';

interface Tool {
  name?: string;
  tier?: number;
  why_this_tool?: string;
  estimated_monthly_cost_cad?: string | number;
}

interface ImpactFigure {
  metric?: string;
  low_range?: string;
  high_range?: string;
  unit?: string;
  timeframe?: string;
}

interface QuantitativeEstimate {
  available?: boolean;
  basis?: string;
  figures?: ImpactFigure[];
  assumptions?: string[];
  confidence?: string;
}

interface ExpectedImpact {
  qualitative?: string;
  quantitative_estimate?: QuantitativeEstimate;
}

interface EffortEstimate {
  setup_effort?: string;
  learning_curve?: string;
  estimated_setup_hours?: string;
}

interface Opportunity {
  pattern_id?: string;
  adapted_title?: string;
  client_specific_framing?: string;
  recommended_path?: string;
  recommended_tools?: Tool[];
  expected_impact?: ExpectedImpact;
  effort_estimate?: EffortEstimate;
  source_pattern_ids?: string[];
}

interface RejectedPattern {
  pattern_id?: string;
  rejection_reason?: string;
}

const BASIS_LABELS: Record<string, string> = {
  client_figures: 'chiffres client',
  sector_benchmarks: 'benchmarks sectoriels',
  hybrid: 'hybride',
  unavailable: 'non disponible',
};

export function OpportunitiesView({ data }: { data: unknown }) {
  const obj = asObject(data);
  if (!obj) {
    return (
      <SectionShell title="Opportunités" subtitle="Output du Skill 2">
        <EmptyHint>Output du Skill 2 indisponible.</EmptyHint>
      </SectionShell>
    );
  }

  const opportunities = asArray<Opportunity>(obj.selected_opportunities);
  const rejected = asArray<RejectedPattern>(obj.rejected_patterns);
  const rationale = asString(obj.selection_rationale);

  return (
    <SectionShell
      title="Opportunités"
      subtitle={`${opportunities.length} opportunité${opportunities.length > 1 ? 's' : ''} retenue${opportunities.length > 1 ? 's' : ''}`}
      meta={<ConfidenceBadge level={asString(obj.confidence_level)} />}
    >
      {rationale && (
        <Subsection title="Logique de sélection">
          <p className="text-sm text-navy-600 whitespace-pre-wrap leading-relaxed">{rationale}</p>
        </Subsection>
      )}

      <div className="flex flex-col gap-4">
        {opportunities.map((opp, idx) => (
          <OpportunityCard key={opp.pattern_id ?? idx} opp={opp} index={idx + 1} />
        ))}
      </div>

      {rejected.length > 0 && (
        <Subsection title={`Patterns écartés (${rejected.length})`}>
          <ul className="flex flex-col gap-2">
            {rejected.map((r, i) => (
              <li
                key={i}
                className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg border border-line bg-cream/60 p-3 text-sm"
              >
                <span className="font-mono text-xs text-muted shrink-0">{r.pattern_id ?? '—'}</span>
                <span className="text-navy-600">{r.rejection_reason ?? '—'}</span>
              </li>
            ))}
          </ul>
        </Subsection>
      )}
    </SectionShell>
  );
}

function OpportunityCard({ opp, index }: { opp: Opportunity; index: number }) {
  const impact = opp.expected_impact;
  const qe = impact?.quantitative_estimate;
  return (
    <article className="rounded-2xl border border-line bg-paper p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 font-mono text-xs font-bold text-white">
              {index}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {pathLabel(opp.recommended_path)}
            </span>
          </div>
          <h4 className="text-base font-bold text-navy-600">{opp.adapted_title ?? 'Sans titre'}</h4>
        </div>
      </header>

      {opp.client_specific_framing && (
        <p className="text-sm text-navy-600 whitespace-pre-wrap leading-relaxed">
          {opp.client_specific_framing}
        </p>
      )}

      {/* Impact attendu */}
      {impact && (
        <div className="flex flex-col gap-3">
          {impact.qualitative && (
            <p className="text-sm text-navy-600">{impact.qualitative}</p>
          )}
          {qe && qe.available && asArray<ImpactFigure>(qe.figures).length > 0 && (
            <HighlightCallout
              title={`Estimation chiffrée — base : ${BASIS_LABELS[qe.basis ?? ''] ?? qe.basis ?? '—'}${qe.confidence ? ` · confiance ${qe.confidence}` : ''}`}
            >
              <ul className="flex flex-col gap-2">
                {asArray<ImpactFigure>(qe.figures).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono text-orange-500 shrink-0">$</span>
                    <span>
                      <strong className="text-navy-600">{f.metric ?? '—'}</strong> :
                      <span className="font-mono ml-1">
                        {f.low_range}{f.high_range ? `–${f.high_range}` : ''}
                      </span>
                      {f.unit ? ` ${f.unit}` : ''}
                      {f.timeframe ? ` (${f.timeframe})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {asArray<string>(qe.assumptions).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted hover:text-navy-600">
                    Hypothèses de calcul
                  </summary>
                  <ul className="list-disc list-inside text-xs text-muted mt-1 space-y-0.5">
                    {asArray<string>(qe.assumptions).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </details>
              )}
            </HighlightCallout>
          )}
          {qe && qe.available === false && (
            <p className="text-xs text-muted italic">
              Pas d'estimation chiffrée disponible.
              {asArray<string>(qe.assumptions).length > 0 && ` Raison : ${qe.assumptions![0]}`}
            </p>
          )}
        </div>
      )}

      {/* Outils recommandés */}
      {asArray<Tool>(opp.recommended_tools).length > 0 && (
        <div>
          <h5 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-2">
            Outils recommandés
          </h5>
          <div className="flex flex-col gap-2">
            {asArray<Tool>(opp.recommended_tools).map((t, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-cream/40 p-3 text-sm flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy-600">{t.name ?? '—'}</span>
                  <div className="flex items-center gap-2">
                    {t.tier != null && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        Tier {t.tier}
                      </span>
                    )}
                    {t.estimated_monthly_cost_cad != null && (
                      <span className="font-mono text-xs text-orange-500 font-semibold">
                        {String(t.estimated_monthly_cost_cad)}
                      </span>
                    )}
                  </div>
                </div>
                {t.why_this_tool && (
                  <p className="text-xs text-muted">{t.why_this_tool}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effort */}
      {opp.effort_estimate && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {opp.effort_estimate.setup_effort != null && (
            <div className="rounded-lg border border-line bg-cream/40 px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Effort</div>
              <div className="text-navy-600 font-medium">{opp.effort_estimate.setup_effort}</div>
            </div>
          )}
          {opp.effort_estimate.learning_curve != null && (
            <div className="rounded-lg border border-line bg-cream/40 px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Apprentissage</div>
              <div className="text-navy-600 font-medium">{opp.effort_estimate.learning_curve}</div>
            </div>
          )}
          {opp.effort_estimate.estimated_setup_hours != null && (
            <div className="rounded-lg border border-line bg-cream/40 px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Heures setup</div>
              <div className="text-navy-600 font-medium">{opp.effort_estimate.estimated_setup_hours}</div>
            </div>
          )}
        </div>
      )}

      <PatternSourceList ids={opp.source_pattern_ids} />
    </article>
  );
}

export default OpportunitiesView;
