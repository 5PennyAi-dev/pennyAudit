import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { RadioGroup } from '../../components/form-fields/RadioGroup';
import { TextAreaInput } from '../../components/form-fields/TextAreaInput';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import {
  BUDGET_RANGE_OPTIONS,
  IMPLEMENTATION_HORIZON_OPTIONS,
  PREFERRED_APPROACH_OPTIONS,
} from '../../lib/intakeOptions';

export function Screen6Resources() {
  const formData = useIntakeFormStore((s) => s.formData);
  const errors = useIntakeFormStore((s) => s.errors);
  const setField = useIntakeFormStore((s) => s.setField);
  const nextScreen = useIntakeFormStore((s) => s.nextScreen);
  const prevScreen = useIntakeFormStore((s) => s.prevScreen);

  const firstRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        nextScreen();
      }}
    >
      <IntakeScreenLayout
        screen={6}
        eyebrow="Bloc 5 · Ressources et horizon"
        title="Vos ressources et votre horizon"
        description="Pour calibrer des recommandations réalistes pour vous."
        footer={<FormNavigation onBack={prevScreen} onNext={() => nextScreen()} />}
      >
        <div ref={firstRef} tabIndex={-1}>
          <RadioGroup
            id="budget_range"
            label="Budget envisagé pour l'implémentation initiale"
            helperText="Une estimation approximative suffit. Ce budget peut inclure abonnements, paramétrage et/ou développement."
            required
            value={formData.budget_range}
            onChange={(v) => setField('budget_range', v)}
            options={BUDGET_RANGE_OPTIONS}
            error={errors.budget_range}
          />
        </div>

        <RadioGroup
          id="implementation_horizon"
          label="Dans quel horizon souhaitez-vous voir des résultats ?"
          required
          value={formData.implementation_horizon}
          onChange={(v) => setField('implementation_horizon', v)}
          options={IMPLEMENTATION_HORIZON_OPTIONS}
          error={errors.implementation_horizon}
        />

        <RadioGroup
          id="preferred_approach"
          label="Comment préférez-vous implémenter les solutions ?"
          required
          value={formData.preferred_approach}
          onChange={(v) => setField('preferred_approach', v)}
          options={PREFERRED_APPROACH_OPTIONS}
          error={errors.preferred_approach}
        />

        <TextAreaInput
          id="additional_context"
          label="Autre chose qu'on devrait savoir ?"
          placeholder="Contexte, contraintes particulières, projets en cours, préférences..."
          helperText="Facultatif. Toute information utile pour personnaliser votre audit."
          maxLength={1000}
          rows={4}
          value={formData.additional_context ?? ''}
          onChange={(v) => setField('additional_context', v)}
          error={errors.additional_context}
        />
      </IntakeScreenLayout>
    </form>
  );
}
