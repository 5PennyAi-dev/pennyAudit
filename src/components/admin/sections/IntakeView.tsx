import { SectionShell, Subsection, EmptyHint } from './_shared';

const FIELD_GROUPS: Array<{ title: string; fields: Array<{ id: string; label: string }> }> = [
  {
    title: 'Identité',
    fields: [
      { id: 'first_name', label: 'Prénom' },
      { id: 'email', label: 'Courriel' },
    ],
  },
  {
    title: 'Entreprise',
    fields: [
      { id: 'business_name', label: 'Nom de l\'entreprise' },
      { id: 'industry', label: 'Secteur' },
      { id: 'industry_other', label: 'Secteur (autre)' },
      { id: 'company_size', label: 'Taille' },
      { id: 'primary_location', label: 'Localisation principale' },
      { id: 'website_url', label: 'Site web' },
    ],
  },
  {
    title: 'Opérations',
    fields: [
      { id: 'revenue_model', label: 'Modèle de revenus' },
      { id: 'client_type', label: 'Type de clientèle' },
      { id: 'contact_channels', label: 'Canaux de contact' },
      { id: 'client_volume', label: 'Volume de clients' },
    ],
  },
  {
    title: 'Défis',
    fields: [
      { id: 'time_consuming_tasks', label: 'Tâches chronophages' },
      { id: 'lost_opportunities', label: 'Opportunités perdues' },
      { id: 'lost_opportunities_detail', label: 'Détails opportunités perdues' },
      { id: 'automation_wish', label: 'Souhait d\'automatisation' },
    ],
  },
  {
    title: 'Stack actuel',
    fields: [
      { id: 'current_tools', label: 'Outils utilisés' },
      { id: 'data_sensitivity', label: 'Sensibilité des données' },
      { id: 'tech_comfort', label: 'Confort technologique' },
    ],
  },
  {
    title: 'Ressources et préférences',
    fields: [
      { id: 'budget_range', label: 'Budget envisagé' },
      { id: 'implementation_horizon', label: 'Horizon d\'implémentation' },
      { id: 'preferred_approach', label: 'Approche préférée' },
      { id: 'additional_context', label: 'Contexte additionnel' },
    ],
  },
];

function renderValue(value: unknown): React.ReactNode {
  if (value == null || value === '') {
    return <span className="italic text-muted">Non renseigné</span>;
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="italic text-muted">Non renseigné</span>;
    return (
      <ul className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <li
            key={i}
            className="inline-flex rounded-full border border-line bg-cream px-2 py-0.5 text-xs text-navy-600"
          >
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <pre className="overflow-x-auto rounded-lg border border-line bg-cream p-2 font-mono text-xs text-navy-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  // string / number
  const str = String(value);
  // Long text → preserve newlines
  if (str.length > 120 || str.includes('\n')) {
    return <p className="whitespace-pre-wrap text-navy-600">{str}</p>;
  }
  return <span className="text-navy-600">{str}</span>;
}

export function IntakeView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <SectionShell title="Intake" subtitle="Réponses brutes du formulaire">
        <EmptyHint>Aucune donnée d'intake disponible.</EmptyHint>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title="Intake"
      subtitle="Réponses du formulaire d'inscription, regroupées par bloc."
    >
      {FIELD_GROUPS.map((group) => (
        <Subsection key={group.title} title={group.title}>
          <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3">
            {group.fields.map((f) => (
              <div key={f.id} className="contents">
                <dt className="text-xs text-muted pt-1">{f.label}</dt>
                <dd className="text-sm">{renderValue(data[f.id])}</dd>
              </div>
            ))}
          </dl>
        </Subsection>
      ))}
    </SectionShell>
  );
}

export default IntakeView;
