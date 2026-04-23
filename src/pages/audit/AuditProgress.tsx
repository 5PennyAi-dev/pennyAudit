import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PipelineStep } from '../../components/audit/PipelineStep';
import { useAuditProgress } from '../../hooks/useAuditProgress';
import { useIntakeFormStore } from '../../stores/intakeFormStore';

export function AuditProgress() {
  const { auditId } = useParams<{ auditId: string }>();
  const formEmail = useIntakeFormStore((s) => s.formData.email);

  const { status, steps, errorMessage, start } = useAuditProgress(auditId);

  useEffect(() => {
    if (auditId) start();
  }, [auditId, start]);

  const clientEmail = formEmail ?? 'votre adresse courriel';

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        {status === 'completed' ? (
          <CompletionPanel clientEmail={clientEmail} />
        ) : status === 'error' ? (
          <ErrorPanel message={errorMessage} />
        ) : (
          <ProgressPanel steps={steps} clientEmail={clientEmail} />
        )}
      </div>
    </div>
  );
}

function ProgressPanel({
  steps,
  clientEmail,
}: {
  steps: ReturnType<typeof useAuditProgress>['steps'];
  clientEmail: string;
}) {
  return (
    <>
      <header className="mb-10 flex flex-col gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
          Production en cours
        </span>
        <h1 className="font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-600 sm:text-4xl">
          Votre audit est en cours de production
        </h1>
        <p className="text-base leading-relaxed text-muted">
          Prenez une pause, on s'occupe du reste. Comptez 5 à 10 minutes.
        </p>
      </header>

      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <PipelineStep
            key={step.id}
            step={step}
            index={i}
            total={steps.length}
          />
        ))}
      </ol>

      <aside className="mt-10 rounded-2xl border border-line bg-cream p-6">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-600">
          Prochaine étape : révision par Christian Couillard
        </p>
        <p className="text-sm leading-relaxed text-navy-600">
          Une fois la production terminée, votre rapport entrera en phase de
          révision humaine (maximum 48 heures ouvrables). Vous recevrez le
          rapport final par courriel à{' '}
          <span className="font-semibold">{clientEmail}</span>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Vous pouvez fermer cet onglet sans perdre votre progression.
        </p>
      </aside>
    </>
  );
}

function CompletionPanel({ clientEmail }: { clientEmail: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-8"
        >
          <polyline points="5 12 10 17 20 7" />
        </svg>
      </div>
      <h1 className="font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-600 sm:text-4xl">
        Votre audit est prêt pour révision
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-muted">
        Christian révisera votre rapport dans les 48 prochaines heures ouvrables
        et vous l'enverra par courriel à{' '}
        <span className="font-semibold text-navy-600">{clientEmail}</span>. Vous
        pouvez maintenant fermer cet onglet.
      </p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-warning-bg text-warning">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-8"
        >
          <line x1="12" y1="8" x2="12" y2="13" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" />
        </svg>
      </div>
      <h1 className="font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-600">
        Une erreur technique s'est produite
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-muted">
        Pas de panique — Christian a été notifié et vous recontactera
        personnellement sous peu. Vous n'avez rien à faire.
      </p>
      {message && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Détails techniques</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-navy-50 p-3 text-left font-mono text-[11px]">
            {message}
          </pre>
        </details>
      )}
    </div>
  );
}
