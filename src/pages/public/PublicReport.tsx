import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReportView } from '../../components/admin/sections/ReportView';

interface PublicAudit {
  id: string;
  first_name: string | null;
  business_name: string | null;
  delivered_at: string | null;
  report: unknown;
}

interface ApiResponse {
  audit: PublicAudit;
}

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function PublicReport() {
  const { token } = useParams<{ token: string }>();
  const [audit, setAudit] = useState<PublicAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/public/report/${encodeURIComponent(token)}`, {
      credentials: 'omit',
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Ce lien n\'est plus valide.');
        if (res.status === 403) throw new Error('Rapport non disponible.');
        if (res.status === 404) throw new Error('Rapport introuvable.');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ApiResponse;
      })
      .then((payload) => {
        if (!cancelled) setAudit(payload.audit);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-cream flex items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          Chargement du rapport…
        </p>
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="min-h-dvh bg-cream flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-orange-500 mb-3">
            5PennyAi · Rapport
          </p>
          <h1 className="text-2xl font-bold text-navy-600 mb-3">
            Ce lien n'est plus valide.
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Contactez-nous à{' '}
            <a
              href="mailto:hello@5pennyai.com"
              className="text-orange-500 hover:text-orange-600 underline-offset-4 hover:underline"
            >
              hello@5pennyai.com
            </a>{' '}
            pour récupérer votre rapport.
          </p>
          {error && (
            <p className="mt-6 text-xs text-muted italic">{error}</p>
          )}
        </div>
      </main>
    );
  }

  const deliveredOn = audit.delivered_at
    ? dateFormatter.format(new Date(audit.delivered_at))
    : null;
  const titleName = audit.business_name ?? audit.first_name ?? 'Votre entreprise';

  return (
    <main className="min-h-dvh bg-cream">
      {/* Header public */}
      <header className="bg-paper border-b border-line print:hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-500">
              5PennyAi
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mt-0.5">
              Rapport d'audit IA
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-cream transition-colors"
          >
            Imprimer
          </button>
        </div>
      </header>

      {/* Bandeau client */}
      <section className="mx-auto max-w-4xl px-4 sm:px-8 pt-10 sm:pt-14 pb-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-500 mb-3">
          Audit personnalisé
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy-600 leading-tight">
          {titleName}
        </h1>
        {deliveredOn && (
          <p className="mt-2 text-sm text-muted">Rapport livré le {deliveredOn}</p>
        )}
      </section>

      {/* Rapport — réutilise ReportView */}
      <section className="mx-auto max-w-4xl px-4 sm:px-8 pb-12">
        <ReportView data={audit.report} />
      </section>

      {/* Pied de page */}
      <footer className="mx-auto max-w-4xl px-4 sm:px-8 py-10 border-t border-line print:hidden">
        <p className="text-sm text-muted">
          Ce rapport a été produit par 5PennyAi puis révisé personnellement par
          Christian Couillard. Pour toute question ou pour aller plus loin sur
          l'une des opportunités identifiées,{' '}
          <a
            href="mailto:hello@5pennyai.com"
            className="text-orange-500 hover:text-orange-600 underline-offset-4 hover:underline"
          >
            écrivez-nous
          </a>
          .
        </p>
        <div className="mt-6 flex justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs text-muted hover:text-navy-600 underline-offset-4 hover:underline"
          >
            Imprimer cette page
          </button>
        </div>
      </footer>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          main { background: white; }
        }
      `}</style>
    </main>
  );
}

export default PublicReport;
