import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PublicReportView } from '../../components/public/PublicReportView';

interface PublicAudit {
  id: string;
  first_name: string | null;
  business_name: string | null;
  delivered_at: string | null;
  report: unknown;
  opportunity_titles: Record<string, string>;
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

  // Document title personnalisé
  useEffect(() => {
    if (audit?.business_name) {
      document.title = `Audit IA — ${audit.business_name}`;
    } else if (audit?.first_name) {
      document.title = `Audit IA — ${audit.first_name}`;
    } else {
      document.title = 'Audit IA — 5PennyAi';
    }
  }, [audit]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-paper flex items-center justify-center px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          Chargement du rapport…
        </p>
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="min-h-dvh bg-paper flex items-center justify-center px-4 py-16">
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
          {error && <p className="mt-6 text-xs text-muted italic">{error}</p>}
        </div>
      </main>
    );
  }

  const deliveredOn = audit.delivered_at
    ? dateFormatter.format(new Date(audit.delivered_at))
    : null;
  const titleName = audit.business_name ?? audit.first_name ?? 'Votre entreprise';

  return (
    <main className="min-h-dvh bg-paper text-navy-600">
      {/* Header public — caché à l'impression */}
      <header className="border-b border-line print:hidden">
        <div className="mx-auto max-w-3xl px-6 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg tracking-tight text-navy-600">5PennyAi</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Rapport d'audit IA
            </span>
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

      {/* Bandeau d'impression — visible uniquement en impression */}
      <div className="hidden print:block print:mb-8">
        <p className="font-bold text-lg text-navy-600">5PennyAi</p>
      </div>

      {/* Bandeau client */}
      <section className="mx-auto max-w-3xl px-6 sm:px-10 pt-12 pb-10 print:pt-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-500 mb-3">
          Audit personnalisé
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-navy-600">
          {titleName}
        </h1>
        {deliveredOn && (
          <p className="mt-3 text-sm text-muted">Rapport livré le {deliveredOn}</p>
        )}
      </section>

      {/* Le rapport */}
      <section className="mx-auto max-w-3xl px-6 sm:px-10 pb-16 print:pb-8">
        <PublicReportView
          data={audit.report}
          opportunityTitles={audit.opportunity_titles ?? {}}
        />
      </section>

      {/* Pied de page — caché à l'impression */}
      <footer className="border-t border-line bg-cream/40 print:hidden">
        <div className="mx-auto max-w-3xl px-6 sm:px-10 py-10">
          <p className="text-sm text-muted leading-relaxed">
            Ce rapport a été produit par 5PennyAi puis révisé personnellement par
            Christian Couillard. Pour toute question ou pour aller plus loin sur l'une
            des opportunités identifiées,{' '}
            <a
              href="mailto:hello@5pennyai.com"
              className="text-orange-500 hover:text-orange-600 underline-offset-4 hover:underline"
            >
              écrivez-nous
            </a>
            .
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs text-muted hover:text-navy-600 underline-offset-4 hover:underline"
            >
              Imprimer cette page
            </button>
          </div>
        </div>
      </footer>

      {/* Pied de page imprimé */}
      <div className="hidden print:block print:mt-8 print:border-t print:border-line print:pt-4">
        <p className="text-xs text-muted">
          Rapport produit et révisé par Christian Couillard · 5PennyAi · hello@5pennyai.com
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 16mm;
          }
          html, body {
            background: white !important;
            color: var(--color-navy-600) !important;
            font-size: 11pt;
          }
          main {
            background: white !important;
          }
          h1 {
            font-size: 26pt !important;
            line-height: 1.1 !important;
          }
          h2 {
            font-size: 11pt !important;
          }
          h3 {
            font-size: 13pt !important;
          }
          h4 {
            font-size: 12pt !important;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          a {
            color: var(--color-navy-600) !important;
            text-decoration: none !important;
          }
        }
      `}</style>
    </main>
  );
}

export default PublicReport;
