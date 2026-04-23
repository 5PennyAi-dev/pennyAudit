import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { CheckboxSingle } from '../../components/form-fields/CheckboxSingle';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import type { IntakeFormData, ScreenId } from '../../types/intake';
import {
  BUDGET_RANGE_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  CLIENT_VOLUME_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CURRENT_TOOLS_OPTIONS,
  DATA_SENSITIVITY_OPTIONS,
  IMPLEMENTATION_HORIZON_OPTIONS,
  INDUSTRY_OPTIONS,
  LOST_OPPORTUNITY_OPTIONS,
  PREFERRED_APPROACH_OPTIONS,
  PRIMARY_LOCATION_OPTIONS,
  REVENUE_MODEL_OPTIONS,
  TECH_COMFORT_OPTIONS,
  getLabel,
  getLabels,
} from '../../lib/intakeOptions';

interface RecapRow {
  label: string;
  value: ReactNode;
}

interface RecapBlock {
  title: string;
  screen: ScreenId;
  rows: RecapRow[];
}

function buildRecap(data: IntakeFormData): RecapBlock[] {
  return [
    {
      title: 'Votre entreprise',
      screen: 2,
      rows: [
        { label: 'Nom', value: data.business_name || '—' },
        {
          label: 'Secteur',
          value:
            data.industry === 'autre'
              ? data.industry_other || 'Autre'
              : getLabel(INDUSTRY_OPTIONS, data.industry) || '—',
        },
        { label: 'Taille', value: getLabel(COMPANY_SIZE_OPTIONS, data.company_size) || '—' },
        { label: 'Localisation', value: getLabel(PRIMARY_LOCATION_OPTIONS, data.primary_location) || '—' },
        { label: 'Site web', value: data.website_url || '—' },
      ],
    },
    {
      title: 'Vos opérations',
      screen: 3,
      rows: [
        { label: 'Modèle de revenus', value: getLabel(REVENUE_MODEL_OPTIONS, data.revenue_model) || '—' },
        { label: 'Type de clients', value: getLabel(CLIENT_TYPE_OPTIONS, data.client_type) || '—' },
        {
          label: 'Canaux de contact',
          value:
            getLabels(CONTACT_CHANNEL_OPTIONS, data.contact_channels).join(', ') ||
            '—',
        },
        { label: 'Volume mensuel', value: getLabel(CLIENT_VOLUME_OPTIONS, data.client_volume) || '—' },
      ],
    },
    {
      title: 'Vos défis',
      screen: 4,
      rows: [
        { label: 'Tâches chronophages', value: data.time_consuming_tasks || '—' },
        {
          label: 'Occasions perdues',
          value:
            getLabels(LOST_OPPORTUNITY_OPTIONS, data.lost_opportunities).join(', ') ||
            '—',
        },
        ...(data.lost_opportunities_detail
          ? [{ label: 'Détail', value: data.lost_opportunities_detail }]
          : []),
        { label: 'À automatiser en priorité', value: data.automation_wish || '—' },
      ],
    },
    {
      title: 'Vos outils et données',
      screen: 5,
      rows: [
        {
          label: 'Outils actuels',
          value:
            getLabels(CURRENT_TOOLS_OPTIONS, data.current_tools).join(', ') || '—',
        },
        {
          label: 'Sensibilité des données',
          value: getLabel(DATA_SENSITIVITY_OPTIONS, data.data_sensitivity) || '—',
        },
        { label: 'Confort technique', value: getLabel(TECH_COMFORT_OPTIONS, data.tech_comfort) || '—' },
      ],
    },
    {
      title: 'Vos ressources',
      screen: 6,
      rows: [
        { label: 'Budget', value: getLabel(BUDGET_RANGE_OPTIONS, data.budget_range) || '—' },
        {
          label: 'Horizon',
          value: getLabel(IMPLEMENTATION_HORIZON_OPTIONS, data.implementation_horizon) || '—',
        },
        {
          label: 'Approche',
          value: getLabel(PREFERRED_APPROACH_OPTIONS, data.preferred_approach) || '—',
        },
        ...(data.additional_context
          ? [{ label: 'Contexte', value: data.additional_context }]
          : []),
      ],
    },
  ];
}

export function Screen7Confirmation() {
  const navigate = useNavigate();
  const formData = useIntakeFormStore((s) => s.formData);
  const errors = useIntakeFormStore((s) => s.errors);
  const setField = useIntakeFormStore((s) => s.setField);
  const goToScreen = useIntakeFormStore((s) => s.goToScreen);
  const prevScreen = useIntakeFormStore((s) => s.prevScreen);
  const validateCurrentScreen = useIntakeFormStore((s) => s.validateCurrentScreen);
  const setSubmitting = useIntakeFormStore((s) => s.setSubmitting);
  const isSubmitting = useIntakeFormStore((s) => s.isSubmitting);
  const saveProgress = useIntakeFormStore((s) => s.saveProgress);

  const recap = buildRecap(formData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCurrentScreen();
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await saveProgress();
      // Session 2A : redirection vers la page d'attente.
      // Session 2B : appellera POST /api/audit/run.
      console.log('[intake] submit — audit prêt à lancer', formData);
      navigate('/intake/submitted');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <IntakeScreenLayout
        screen={7}
        eyebrow="Étape finale"
        title={
          <>
            Prêt(e) à recevoir votre <span className="text-orange-500">audit</span> ?
          </>
        }
        description="En cliquant « Lancer mon audit », vous lancez la génération personnalisée de votre rapport. Le processus prend environ 5 à 10 minutes — vous pouvez suivre le progrès en temps réel ou quitter la page et recevoir le rapport par courriel."
        footer={
          <FormNavigation
            onBack={prevScreen}
            isFinalScreen
            isSubmitting={isSubmitting}
          />
        }
      >
        <div className="flex flex-col gap-4">
          {recap.map((block) => (
            <article
              key={block.screen}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <header className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-sans text-base font-bold text-navy-600">
                  {block.title}
                </h2>
                <button
                  type="button"
                  onClick={() => goToScreen(block.screen, { skipValidation: true })}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-orange-500 hover:text-orange-600"
                >
                  Modifier
                </button>
              </header>
              <dl className="flex flex-col gap-2 text-sm">
                {block.rows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,160px)_1fr] gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0"
                  >
                    <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
                      {row.label}
                    </dt>
                    <dd className="text-navy-600 [overflow-wrap:anywhere]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <CheckboxSingle
            id="terms_acceptance"
            label={
              <>
                J'accepte les{' '}
                <a href="/terms" target="_blank" rel="noreferrer" className="underline">
                  conditions d'utilisation
                </a>{' '}
                et la{' '}
                <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
                  politique de confidentialité
                </a>
                .
              </>
            }
            required
            value={formData.terms_acceptance ?? false}
            onChange={(v) => setField('terms_acceptance', v)}
            error={errors.terms_acceptance}
          />

          <CheckboxSingle
            id="marketing_consent"
            label="J'accepte de recevoir occasionnellement des communications de 5PennyAi."
            helperText="Facultatif. Vous pouvez vous désabonner à tout moment."
            value={formData.marketing_consent ?? false}
            onChange={(v) => setField('marketing_consent', v)}
          />
        </div>
      </IntakeScreenLayout>
    </form>
  );
}
