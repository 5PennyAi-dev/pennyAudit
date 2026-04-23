import { useEffect, useRef } from 'react';
import { IntakeScreenLayout } from './IntakeScreenLayout';
import { TextAreaInput } from '../../components/form-fields/TextAreaInput';
import { MultiSelectCheckboxes } from '../../components/form-fields/MultiSelectCheckboxes';
import { FormNavigation } from '../../components/form/FormNavigation';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import { LOST_OPPORTUNITY_OPTIONS } from '../../lib/intakeOptions';

export function Screen4Challenges() {
  const formData = useIntakeFormStore((s) => s.formData);
  const errors = useIntakeFormStore((s) => s.errors);
  const setField = useIntakeFormStore((s) => s.setField);
  const nextScreen = useIntakeFormStore((s) => s.nextScreen);
  const prevScreen = useIntakeFormStore((s) => s.prevScreen);

  const firstRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const showLostOppDetail = (formData.lost_opportunities ?? []).includes('autre');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        nextScreen();
      }}
    >
      <IntakeScreenLayout
        screen={4}
        eyebrow="Bloc 3 · Vos défis"
        title="Vos défis au quotidien"
        description="C'est la section la plus importante. Vos réponses ici orientent directement les opportunités que nous allons identifier."
        footer={<FormNavigation onBack={prevScreen} onNext={() => nextScreen()} />}
      >
        <TextAreaInput
          ref={firstRef}
          id="time_consuming_tasks"
          label="Quelles tâches prennent le plus de temps à vous ou à votre équipe ?"
          placeholder="Exemple : Je passe environ 2 heures par jour à répondre aux mêmes questions de clients au téléphone et par courriel, surtout pour les prises de rendez-vous et les questions sur les tarifs."
          helperText="⚡ Astuce : plus votre réponse est précise et détaillée (exemples concrets, temps passé, fréquence), plus votre audit sera pertinent."
          required
          minLength={50}
          maxLength={2000}
          rows={6}
          value={formData.time_consuming_tasks ?? ''}
          onChange={(v) => setField('time_consuming_tasks', v)}
          error={errors.time_consuming_tasks}
        />

        <MultiSelectCheckboxes
          id="lost_opportunities"
          label="Où perdez-vous des clients ou des occasions d'affaires ?"
          helperText="Cochez ce qui s'applique. Vous pourrez préciser ensuite."
          required
          value={formData.lost_opportunities}
          onChange={(v) => setField('lost_opportunities', v)}
          options={LOST_OPPORTUNITY_OPTIONS}
          error={errors.lost_opportunities}
        />

        {showLostOppDetail && (
          <TextAreaInput
            id="lost_opportunities_detail"
            label="Précisez (facultatif)"
            placeholder="Décrivez une situation récente où vous avez perdu une occasion."
            maxLength={1000}
            rows={3}
            value={formData.lost_opportunities_detail ?? ''}
            onChange={(v) => setField('lost_opportunities_detail', v)}
            error={errors.lost_opportunities_detail}
          />
        )}

        <TextAreaInput
          id="automation_wish"
          label="Si vous pouviez automatiser UNE seule chose demain, ce serait quoi ?"
          placeholder="Exemple : Les confirmations et rappels de rendez-vous par texto, parce que j'ai trop de no-shows."
          helperText="Votre réponse devient la priorité #1 de votre feuille de route."
          required
          minLength={30}
          maxLength={500}
          rows={4}
          value={formData.automation_wish ?? ''}
          onChange={(v) => setField('automation_wish', v)}
          error={errors.automation_wish}
        />
      </IntakeScreenLayout>
    </form>
  );
}
