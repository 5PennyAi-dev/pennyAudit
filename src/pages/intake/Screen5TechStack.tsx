import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { MultiSelectCheckboxes } from '../../components/form-fields/MultiSelectCheckboxes';
import { RadioGroup } from '../../components/form-fields/RadioGroup';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import {
  CURRENT_TOOLS_OPTIONS,
  DATA_SENSITIVITY_OPTIONS,
  TECH_COMFORT_OPTIONS,
} from '../../lib/intakeOptions';

export function Screen5TechStack() {
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
        screen={5}
        eyebrow="Bloc 4 · Outils et données"
        title="Vos outils et vos données"
        description="Pour évaluer la compatibilité technique des solutions."
        footer={<FormNavigation onBack={prevScreen} onNext={() => nextScreen()} />}
      >
        <div ref={firstRef} tabIndex={-1}>
          <MultiSelectCheckboxes
            id="current_tools"
            label="Quels outils utilisez-vous déjà ?"
            helperText="Cochez tout ce qui s'applique, même partiellement."
            value={formData.current_tools}
            onChange={(v) => setField('current_tools', v)}
            options={CURRENT_TOOLS_OPTIONS}
            error={errors.current_tools}
          />
        </div>

        <RadioGroup
          id="data_sensitivity"
          label="Quel est le type de données le plus sensible que vous manipulez ?"
          required
          value={formData.data_sensitivity}
          onChange={(v) => setField('data_sensitivity', v)}
          options={DATA_SENSITIVITY_OPTIONS}
          error={errors.data_sensitivity}
        />

        <RadioGroup
          id="tech_comfort"
          label="Votre niveau de confort avec la technologie"
          required
          value={formData.tech_comfort}
          onChange={(v) => setField('tech_comfort', v)}
          options={TECH_COMFORT_OPTIONS}
          error={errors.tech_comfort}
        />
      </IntakeScreenLayout>
    </form>
  );
}
