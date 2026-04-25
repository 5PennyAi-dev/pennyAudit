import {
  SectionShell,
  Subsection,
  ConfidenceBadge,
  HighlightCallout,
  EmptyHint,
  asArray,
  asObject,
  asString,
} from './_shared';

interface BenchmarkRow {
  metric?: string;
  value?: string;
  source?: string;
  source_year?: string;
  source_url?: string | null;
  geographic_scope?: string;
  relevance_to_client?: string;
}

interface ExtractedFigure {
  raw_quote?: string;
  interpreted_value?: string;
  unit?: string;
  dimension?: string;
  source_field?: string;
}

const SCOPE_LABELS: Record<string, string> = {
  quebec: 'Québec',
  canada: 'Canada',
  etats_unis: 'États-Unis',
  international: 'International',
};

export function ContextView({ data }: { data: unknown }) {
  const obj = asObject(data);
  if (!obj) {
    return (
      <SectionShell title="Contexte" subtitle="Output du Skill 1">
        <EmptyHint>Output du Skill 1 indisponible.</EmptyHint>
      </SectionShell>
    );
  }

  const profile = asObject(obj.business_profile);
  const operational = asObject(obj.operational_context);
  const challenges = asObject(obj.challenges_summary);
  const maturity = asObject(obj.maturity_assessment);
  const portrait = asObject(obj.industry_portrait);
  const extracted = asObject(obj.extracted_client_figures);

  return (
    <SectionShell
      title="Contexte"
      subtitle="Synthèse structurée du client (Skill 1)"
      meta={<ConfidenceBadge level={asString(obj.confidence_level)} />}
    >
      {/* Profil entreprise */}
      {profile && (
        <Subsection title="Profil entreprise">
          {Boolean(profile.narrative) && (
            <p className="text-sm text-navy-600 leading-relaxed whitespace-pre-wrap">
              {asString(profile.narrative)}
            </p>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-2 text-sm">
            {profile.industry_vertical != null && (
              <>
                <dt className="text-xs text-muted">Secteur</dt>
                <dd className="text-navy-600">{asString(profile.industry_vertical)}</dd>
              </>
            )}
            {profile.business_model_type != null && (
              <>
                <dt className="text-xs text-muted">Modèle d'affaires</dt>
                <dd className="text-navy-600">{asString(profile.business_model_type)}</dd>
              </>
            )}
            {profile.client_segment != null && (
              <>
                <dt className="text-xs text-muted">Segment client</dt>
                <dd className="text-navy-600">{asString(profile.client_segment)}</dd>
              </>
            )}
          </dl>
        </Subsection>
      )}

      {/* Contexte opérationnel */}
      {operational && (
        <Subsection title="Contexte opérationnel">
          <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-2 text-sm">
            {operational.contact_channels_analysis != null && (
              <>
                <dt className="text-xs text-muted">Canaux de contact</dt>
                <dd className="text-navy-600">{asString(operational.contact_channels_analysis)}</dd>
              </>
            )}
            {operational.volume_tier != null && (
              <>
                <dt className="text-xs text-muted">Niveau de volume</dt>
                <dd className="text-navy-600">{asString(operational.volume_tier)}</dd>
              </>
            )}
            {asArray<string>(operational.key_operations_identified).length > 0 && (
              <>
                <dt className="text-xs text-muted">Opérations clés</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1.5">
                    {asArray<string>(operational.key_operations_identified).map((op, i) => (
                      <li key={i} className="inline-flex rounded-full border border-line bg-cream px-2 py-0.5 text-xs text-navy-600">
                        {op}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </Subsection>
      )}

      {/* Défis */}
      {challenges && (
        <Subsection title="Résumé des défis">
          {asArray<string>(challenges.primary_pain_points).length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Pain points principaux</p>
              <ul className="list-disc list-inside text-sm text-navy-600 space-y-1">
                {asArray<string>(challenges.primary_pain_points).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {asArray<string>(challenges.opportunity_loss_patterns).length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Pertes d'opportunités</p>
              <ul className="list-disc list-inside text-sm text-navy-600 space-y-1">
                {asArray<string>(challenges.opportunity_loss_patterns).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {Boolean(challenges.stated_automation_wish) && (
            <div>
              <p className="text-xs text-muted mb-1">Souhait d'automatisation</p>
              <p className="text-sm text-navy-600 whitespace-pre-wrap">
                {asString(challenges.stated_automation_wish)}
              </p>
            </div>
          )}
        </Subsection>
      )}

      {/* Maturité */}
      {maturity && (
        <Subsection title="Évaluation de maturité">
          <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-2 text-sm">
            {maturity.digital_maturity_level != null && (
              <>
                <dt className="text-xs text-muted">Maturité numérique</dt>
                <dd className="text-navy-600">{asString(maturity.digital_maturity_level)}</dd>
              </>
            )}
            {maturity.tech_comfort_confirmed != null && (
              <>
                <dt className="text-xs text-muted">Confort tech confirmé</dt>
                <dd className="text-navy-600">{asString(maturity.tech_comfort_confirmed)}</dd>
              </>
            )}
            {maturity.existing_stack_summary != null && (
              <>
                <dt className="text-xs text-muted">Stack existante</dt>
                <dd className="text-navy-600">{asString(maturity.existing_stack_summary)}</dd>
              </>
            )}
            {maturity.readiness_for_change != null && (
              <>
                <dt className="text-xs text-muted">Ouverture au changement</dt>
                <dd className="text-navy-600">{asString(maturity.readiness_for_change)}</dd>
              </>
            )}
          </dl>
        </Subsection>
      )}

      {/* Portrait sectoriel — highlight */}
      {portrait && (
        <Subsection title="Portrait sectoriel">
          <HighlightCallout
            title={`Recherche web — couverture : ${asString(portrait.search_coverage, 'n/a')}`}
          >
            {Boolean(portrait.narrative) && (
              <p className="whitespace-pre-wrap mb-3">{asString(portrait.narrative)}</p>
            )}
            {asArray<BenchmarkRow>(portrait.benchmarks).length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-line">
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Indicateur</th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Valeur</th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Source</th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Portée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asArray<BenchmarkRow>(portrait.benchmarks).map((b, i) => (
                      <tr key={i} className="border-b border-line/50 last:border-b-0 align-top">
                        <td className="py-2 pr-3 text-navy-600">{b.metric ?? '—'}</td>
                        <td className="py-2 pr-3 font-mono text-navy-600">{b.value ?? '—'}</td>
                        <td className="py-2 pr-3 text-navy-600">
                          {b.source_url ? (
                            <a
                              href={b.source_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-orange-500 hover:text-orange-600 underline-offset-2 hover:underline"
                            >
                              {b.source ?? b.source_url}
                            </a>
                          ) : (
                            b.source ?? '—'
                          )}
                          {b.source_year ? ` (${b.source_year})` : ''}
                          {b.relevance_to_client && (
                            <p className="text-xs text-muted mt-0.5">{b.relevance_to_client}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-navy-600">
                          {b.geographic_scope ? SCOPE_LABELS[b.geographic_scope] ?? b.geographic_scope : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HighlightCallout>
        </Subsection>
      )}

      {/* Chiffres extraits du client */}
      {extracted && (
        <Subsection
          title={`Chiffres extraits du client — couverture : ${asString(extracted.extraction_coverage, 'n/a')}`}
        >
          {asArray<ExtractedFigure>(extracted.figures).length === 0 ? (
            <EmptyHint>Aucun chiffre concret n'a été extrait du texte libre.</EmptyHint>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Citation</th>
                    <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Valeur</th>
                    <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Dimension</th>
                    <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Champ source</th>
                  </tr>
                </thead>
                <tbody>
                  {asArray<ExtractedFigure>(extracted.figures).map((f, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-b-0 align-top">
                      <td className="py-2 pr-3 text-navy-600 italic">« {f.raw_quote ?? '—'} »</td>
                      <td className="py-2 pr-3 font-mono text-navy-600">{f.interpreted_value ?? '—'}</td>
                      <td className="py-2 pr-3 text-navy-600">
                        {f.dimension ?? '—'}{f.unit ? ` (${f.unit})` : ''}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted">{f.source_field ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Subsection>
      )}
    </SectionShell>
  );
}

export default ContextView;
