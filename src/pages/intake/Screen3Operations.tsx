import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { RadioGroup } from '../../components/form-fields/RadioGroup';
import { MultiSelectCheckboxes } from '../../components/form-fields/MultiSelectCheckboxes';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import {
  REVENUE_MODEL_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CLIENT_VOLUME_OPTIONS,
} from '../../lib/intakeOptions';

export function Screen3Operations() {
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
        screen={3}
        eyebrow="Bloc 2 · Vos opérations"
        title="Comment vous opérez"
        description="Pour comprendre votre modèle et votre relation client."
        footer={
          <FormNavigation onBack={prevScreen} onNext={() => nextScreen()} />
        }
      >
        <div ref={firstRef} tabIndex={-1}>
          <RadioGroup
            id="revenue_model"
            label="Votre modèle de revenus principal"
            required
            value={formData.revenue_model}
            onChange={(v) => setField('revenue_model', v)}
            options={REVENUE_MODEL_OPTIONS}
            error={errors.revenue_model}
          />
        </div>

        <RadioGroup
          id="client_type"
          label="Vos clients sont principalement…"
          required
          value={formData.client_type}
          onChange={(v) => setField('client_type', v)}
          options={CLIENT_TYPE_OPTIONS}
          error={errors.client_type}
        />

        <MultiSelectCheckboxes
          id="contact_channels"
          label="Comment vos clients vous contactent-ils ?"
          helperText="Cochez tous les canaux applicables."
          required
          value={formData.contact_channels}
          onChange={(v) => setField('contact_channels', v)}
          options={CONTACT_CHANNEL_OPTIONS}
          error={errors.contact_channels}
        />

        <RadioGroup
          id="client_volume"
          label="Environ combien de clients traitez-vous par mois ?"
          required
          value={formData.client_volume}
          onChange={(v) => setField('client_volume', v)}
          options={CLIENT_VOLUME_OPTIONS}
          error={errors.client_volume}
        />
      </IntakeScreenLayout>
    </form>
  );
}
