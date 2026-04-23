import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { TextInput } from '../../components/form-fields/TextInput';
import { EmailInput, isValidEmail } from '../../components/form-fields/EmailInput';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';

export function Screen1Welcome() {
  const formData = useIntakeFormStore((s) => s.formData);
  const errors = useIntakeFormStore((s) => s.errors);
  const setField = useIntakeFormStore((s) => s.setField);
  const nextScreen = useIntakeFormStore((s) => s.nextScreen);

  const firstNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  const firstName = formData.first_name ?? '';
  const email = formData.email ?? '';

  const canContinue =
    firstName.trim().length > 0 && isValidEmail(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextScreen();
  };

  return (
    <form onSubmit={handleSubmit}>
      <IntakeScreenLayout
        screen={1}
        eyebrow="Bienvenue"
        title={
          <>
            Commençons votre <span className="text-orange-500">audit IA</span>
          </>
        }
        description="Répondez à 19 questions (5-7 minutes) pour recevoir un rapport d'audit personnalisé avec 3-5 opportunités concrètes d'IA adaptées à votre entreprise."
        footer={
          <FormNavigation
            showBack={false}
            nextDisabled={!canContinue}
            onNext={() => nextScreen()}
          />
        }
      >
        <TextInput
          ref={firstNameRef}
          id="first_name"
          label="Votre prénom"
          placeholder="Marie"
          required
          maxLength={50}
          autoComplete="given-name"
          value={firstName}
          onChange={(v) => setField('first_name', v)}
          error={errors.first_name}
        />

        <EmailInput
          id="email"
          label="Votre courriel"
          placeholder="marie@exemple.com"
          helperText="On vous enverra votre rapport ici. Pas de pourriel, promis."
          required
          value={email}
          onChange={(v) => setField('email', v)}
          error={errors.email}
        />

        <p className="font-mono text-[11px] leading-relaxed text-muted">
          🔒 Vos données sont stockées au Canada, jamais vendues, et utilisées
          uniquement pour générer votre audit.
        </p>
      </IntakeScreenLayout>
    </form>
  );
}
