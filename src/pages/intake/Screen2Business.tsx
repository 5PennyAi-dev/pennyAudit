import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { TextInput } from '../../components/form-fields/TextInput';
import { SelectDropdown } from '../../components/form-fields/SelectDropdown';
import { RadioGroup } from '../../components/form-fields/RadioGroup';
import { UrlInput } from '../../components/form-fields/UrlInput';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import {
  INDUSTRY_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  PRIMARY_LOCATION_OPTIONS,
} from '../../lib/intakeOptions';

export function Screen2Business() {
  const formData = useIntakeFormStore((s) => s.formData);
  const errors = useIntakeFormStore((s) => s.errors);
  const setField = useIntakeFormStore((s) => s.setField);
  const nextScreen = useIntakeFormStore((s) => s.nextScreen);
  const prevScreen = useIntakeFormStore((s) => s.prevScreen);

  const firstRef = useRef<HTMLInputElement>(null);
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
        screen={2}
        eyebrow="Bloc 1 · Votre entreprise"
        title="Parlons de votre entreprise"
        description="Quelques infos de base pour contextualiser l'audit."
        footer={
          <FormNavigation
            onBack={prevScreen}
            onNext={() => nextScreen()}
          />
        }
      >
        <TextInput
          ref={firstRef}
          id="business_name"
          label="Nom de votre entreprise"
          placeholder="Ex : Clinique dentaire Tremblay"
          required
          maxLength={100}
          value={formData.business_name ?? ''}
          onChange={(v) => setField('business_name', v)}
          error={errors.business_name}
        />

        <SelectDropdown
          id="industry"
          label="Secteur d'activité principal"
          required
          value={formData.industry}
          onChange={(v) => setField('industry', v)}
          options={INDUSTRY_OPTIONS}
          error={errors.industry}
        />

        {formData.industry === 'autre' && (
          <TextInput
            id="industry_other"
            label="Précisez votre secteur"
            required
            maxLength={100}
            value={formData.industry_other ?? ''}
            onChange={(v) => setField('industry_other', v)}
            error={errors.industry_other}
          />
        )}

        <RadioGroup
          id="company_size"
          label="Taille de votre équipe"
          required
          value={formData.company_size}
          onChange={(v) => setField('company_size', v)}
          options={COMPANY_SIZE_OPTIONS}
          error={errors.company_size}
        />

        <RadioGroup
          id="primary_location"
          label="Où votre entreprise opère-t-elle principalement ?"
          required
          value={formData.primary_location}
          onChange={(v) => setField('primary_location', v)}
          options={PRIMARY_LOCATION_OPTIONS}
          error={errors.primary_location}
        />

        <UrlInput
          id="website_url"
          label="Site web actuel (si vous en avez un)"
          helperText="Facultatif. Nous permet de mieux comprendre votre présence en ligne."
          value={formData.website_url ?? ''}
          onChange={(v) => setField('website_url', v)}
          error={errors.website_url}
        />
      </IntakeScreenLayout>
    </form>
  );
}
