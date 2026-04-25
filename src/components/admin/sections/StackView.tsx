import {
  SectionShell,
  Subsection,
  ConfidenceBadge,
  DifficultyPill,
  PriorityPill,
  EmptyHint,
  asArray,
  asObject,
  asString,
} from './_shared';

interface StackAssessment {
  current_stack_summary?: string;
  strengths?: string[];
  gaps?: string[];
}

interface IntegrationItem {
  opportunity_id?: string;
  integration_difficulty?: string;
  integration_approach?: string;
  blockers_if_any?: string[];
}

interface Dependency {
  dependency?: string;
  impacts_opportunities?: string[] | string;
  resolution_path?: string;
  estimated_effort?: string;
}

interface Modernization {
  current_state?: string;
  recommended_state?: string;
  justification?: string;
  priority?: string;
}

const READINESS_LABELS: Record<string, { label: string; cls: string }> = {
  pret: { label: 'Prêt', cls: 'bg-success-bg text-success border-success/40' },
  presque_pret: { label: 'Presque prêt', cls: 'bg-navy-50 text-navy-600 border-navy-100' },
  prerequis_a_resoudre: { label: 'Prérequis à résoudre', cls: 'bg-warning-bg text-warning border-warning/40' },
  ecart_important: { label: 'Écart important', cls: 'bg-danger-bg text-danger border-danger/40' },
};

export function StackView({ data }: { data: unknown }) {
  const obj = asObject(data);
  if (!obj) {
    return (
      <SectionShell title="Stack" subtitle="Output du Skill 4">
        <EmptyHint>Output du Skill 4 indisponible.</EmptyHint>
      </SectionShell>
    );
  }

  const assessment = asObject(obj.stack_assessment) as StackAssessment | null;
  const integrationMap = asArray<IntegrationItem>(obj.integration_map);
  const deps = asArray<Dependency>(obj.dependencies_to_resolve);
  const moderns = asArray<Modernization>(obj.modernizations_required);
  const readiness = asString(obj.overall_readiness).toLowerCase();
  const readinessEntry = READINESS_LABELS[readiness];

  return (
    <SectionShell
      title="Stack"
      subtitle="Évaluation technique et intégrations (Skill 4)"
      meta={
        <div className="flex flex-col items-end gap-2">
          {readinessEntry && (
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${readinessEntry.cls}`}
            >
              {readinessEntry.label}
            </span>
          )}
          <ConfidenceBadge level={asString(obj.confidence_level)} />
        </div>
      }
    >
      {assessment && (
        <Subsection title="Évaluation actuelle">
          {assessment.current_stack_summary && (
            <p className="text-sm text-navy-600 whitespace-pre-wrap mb-3">
              {assessment.current_stack_summary}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-cream/40 p-3">
              <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-success mb-1">
                Forces
              </h6>
              {asArray<string>(assessment.strengths).length === 0 ? (
                <p className="text-xs text-muted italic">—</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-navy-600 space-y-0.5">
                  {asArray<string>(assessment.strengths).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-line bg-cream/40 p-3">
              <h6 className="font-mono text-[10px] uppercase tracking-[0.08em] text-warning mb-1">
                Lacunes
              </h6>
              {asArray<string>(assessment.gaps).length === 0 ? (
                <p className="text-xs text-muted italic">—</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-navy-600 space-y-0.5">
                  {asArray<string>(assessment.gaps).map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Subsection>
      )}

      {/* Carte d'intégration par opportunité */}
      {integrationMap.length > 0 && (
        <Subsection title="Plan d'intégration par opportunité">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Opportunité</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Difficulté</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Approche</th>
                </tr>
              </thead>
              <tbody>
                {integrationMap.map((it, i) => (
                  <tr key={i} className="border-b border-line/50 last:border-b-0 align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-navy-600">
                      {it.opportunity_id ?? '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <DifficultyPill value={it.integration_difficulty} />
                    </td>
                    <td className="py-2 pr-3 text-navy-600">
                      <p>{it.integration_approach ?? '—'}</p>
                      {asArray<string>(it.blockers_if_any).length > 0 && (
                        <p className="text-xs text-danger mt-1">
                          Bloqueurs : {asArray<string>(it.blockers_if_any).join(' · ')}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Subsection>
      )}

      {/* Dépendances */}
      {deps.length > 0 && (
        <Subsection title="Dépendances à résoudre">
          <ul className="flex flex-col gap-2">
            {deps.map((d, i) => (
              <li
                key={i}
                className="rounded-lg border border-line bg-cream/40 p-3 text-sm flex flex-col gap-1"
              >
                <p className="font-medium text-navy-600">{d.dependency ?? '—'}</p>
                {d.resolution_path && (
                  <p className="text-xs text-muted">Résolution : {d.resolution_path}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted">
                  {d.estimated_effort && <span>Effort : {d.estimated_effort}</span>}
                  {d.impacts_opportunities && (
                    <span>
                      Impact : {Array.isArray(d.impacts_opportunities)
                        ? d.impacts_opportunities.join(', ')
                        : String(d.impacts_opportunities)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Subsection>
      )}

      {/* Modernisations */}
      {moderns.length > 0 && (
        <Subsection title="Modernisations recommandées">
          <ul className="flex flex-col gap-2">
            {moderns.map((m, i) => (
              <li
                key={i}
                className="rounded-lg border border-line bg-cream/40 p-3 flex flex-col gap-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy-600">
                    {m.current_state ?? '—'} → {m.recommended_state ?? '—'}
                  </span>
                  <PriorityPill priority={m.priority} />
                </div>
                {m.justification && (
                  <p className="text-xs text-muted">{m.justification}</p>
                )}
              </li>
            ))}
          </ul>
        </Subsection>
      )}
    </SectionShell>
  );
}

export default StackView;
