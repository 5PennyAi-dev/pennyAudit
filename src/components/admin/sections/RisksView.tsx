import {
  SectionShell,
  Subsection,
  ConfidenceBadge,
  HighlightCallout,
  PatternSourceList,
  SeverityPill,
  EmptyHint,
  asArray,
  asObject,
  asString,
} from './_shared';

interface Risk {
  risk_id?: string;
  category?: string;
  description?: string;
  severity?: string;
  affected_opportunities?: string[];
  likelihood?: string;
  mitigation?: { immediate_actions?: string[]; ongoing_practices?: string[] };
  source_pattern_ids?: string[];
}

interface Loi25 {
  applies?: boolean;
  reason?: string;
  key_obligations?: string[];
  recommended_actions?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  technique: 'Technique',
  conformite_reglementaire: 'Conformité réglementaire',
  humain_organisationnel: 'Humain / organisationnel',
  donnees_confidentialite: 'Données / confidentialité',
  financier_roi: 'Financier / ROI',
};

const LIKELIHOOD_LABELS: Record<string, string> = {
  peu_probable: 'Peu probable',
  possible: 'Possible',
  probable: 'Probable',
  tres_probable: 'Très probable',
};

const OVERALL_RISK_LABELS: Record<string, { label: string; cls: string }> = {
  faible: { label: 'Risque global faible', cls: 'bg-success-bg text-success border-success/40' },
  modere: { label: 'Risque global modéré', cls: 'bg-warning-bg text-warning border-warning/40' },
  eleve: { label: 'Risque global élevé', cls: 'bg-danger-bg text-danger border-danger/40' },
};

export function RisksView({ data }: { data: unknown }) {
  const obj = asObject(data);
  if (!obj) {
    return (
      <SectionShell title="Risques" subtitle="Output du Skill 3">
        <EmptyHint>Output du Skill 3 indisponible.</EmptyHint>
      </SectionShell>
    );
  }

  const risks = asArray<Risk>(obj.risks_identified);
  const loi25 = asObject(obj.loi_25_applicability) as Loi25 | null;
  const overall = asString(obj.overall_risk_level).toLowerCase();
  const overallEntry = OVERALL_RISK_LABELS[overall];

  // Group risks by category
  const grouped = new Map<string, Risk[]>();
  for (const r of risks) {
    const key = r.category ?? 'autre';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <SectionShell
      title="Risques"
      subtitle={`${risks.length} risque${risks.length > 1 ? 's' : ''} identifié${risks.length > 1 ? 's' : ''}`}
      meta={
        <div className="flex flex-col items-end gap-2">
          {overallEntry && (
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${overallEntry.cls}`}
            >
              {overallEntry.label}
            </span>
          )}
          <ConfidenceBadge level={asString(obj.confidence_level)} />
        </div>
      }
    >
      {/* Loi 25 — highlight si applies */}
      {loi25 && (
        <Subsection title="Loi 25 (Québec)">
          {loi25.applies ? (
            <HighlightCallout title="Applicable">
              {loi25.reason && <p className="mb-3">{loi25.reason}</p>}
              {asArray<string>(loi25.key_obligations).length > 0 && (
                <div className="mb-3">
                  <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                    Obligations principales
                  </h6>
                  <ul className="list-disc list-inside space-y-0.5">
                    {asArray<string>(loi25.key_obligations).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {asArray<string>(loi25.recommended_actions).length > 0 && (
                <div>
                  <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                    Actions recommandées
                  </h6>
                  <ul className="list-disc list-inside space-y-0.5">
                    {asArray<string>(loi25.recommended_actions).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </HighlightCallout>
          ) : (
            <p className="text-sm text-muted">
              Non applicable.{loi25.reason ? ` ${loi25.reason}` : ''}
            </p>
          )}
        </Subsection>
      )}

      {/* Risques groupés par catégorie */}
      {risks.length === 0 ? (
        <EmptyHint>Aucun risque identifié.</EmptyHint>
      ) : (
        [...grouped.entries()].map(([cat, items]) => (
          <Subsection key={cat} title={CATEGORY_LABELS[cat] ?? cat}>
            <ul className="flex flex-col gap-3">
              {items.map((r, i) => (
                <li
                  key={r.risk_id ?? i}
                  className="rounded-lg border border-line bg-paper p-4 flex flex-col gap-2"
                >
                  <header className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-navy-600 flex-1">
                      {r.description ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SeverityPill severity={r.severity} />
                      {r.likelihood && (
                        <span className="inline-flex rounded-full border border-line bg-cream px-2 py-0.5 font-mono text-[10px] text-muted">
                          {LIKELIHOOD_LABELS[r.likelihood] ?? r.likelihood}
                        </span>
                      )}
                    </div>
                  </header>
                  {r.mitigation && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                      {asArray<string>(r.mitigation.immediate_actions).length > 0 && (
                        <div className="rounded-lg bg-cream/60 p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-orange-700 mb-1">
                            Actions immédiates
                          </p>
                          <ul className="list-disc list-inside text-navy-600 space-y-0.5">
                            {asArray<string>(r.mitigation.immediate_actions).map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {asArray<string>(r.mitigation.ongoing_practices).length > 0 && (
                        <div className="rounded-lg bg-cream/60 p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                            Pratiques en continu
                          </p>
                          <ul className="list-disc list-inside text-navy-600 space-y-0.5">
                            {asArray<string>(r.mitigation.ongoing_practices).map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {(asArray<string>(r.affected_opportunities).length > 0 ||
                    asArray<string>(r.source_pattern_ids).length > 0) && (
                    <footer className="flex flex-wrap items-center gap-2 pt-1 border-t border-line">
                      {asArray<string>(r.affected_opportunities).length > 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                          Opportunités touchées : {asArray<string>(r.affected_opportunities).join(', ')}
                        </span>
                      )}
                      <PatternSourceList ids={r.source_pattern_ids} />
                    </footer>
                  )}
                </li>
              ))}
            </ul>
          </Subsection>
        ))
      )}
    </SectionShell>
  );
}

export default RisksView;
