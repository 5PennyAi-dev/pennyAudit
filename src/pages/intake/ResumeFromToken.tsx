import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntakeFormStore } from '../../stores/intakeFormStore';

export function ResumeFromToken() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const loadFromResumeToken = useIntakeFormStore((s) => s.loadFromResumeToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide.');
      return;
    }
    let cancelled = false;
    loadFromResumeToken(token)
      .then(() => {
        if (!cancelled) navigate('/intake', { replace: true });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Impossible de reprendre.');
      });
    return () => {
      cancelled = true;
    };
  }, [token, loadFromResumeToken, navigate]);

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center sm:px-6">
        {error ? (
          <>
            <h1 className="font-sans text-3xl font-bold tracking-[-0.02em] text-navy-600">
              Lien invalide ou expiré
            </h1>
            <p className="text-base leading-relaxed text-muted">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/intake', { replace: true })}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Recommencer l'audit
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
              Chargement
            </span>
            <p className="text-base text-muted">
              Nous reprenons votre audit là où vous l'aviez laissé…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
