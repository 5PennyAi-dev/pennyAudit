// Section admin de l'onglet Rapport — gestion des diagrammes générés.
//
// Affiche pour chaque entrée de diagrams_metadata :
//   - pastille de statut (vert "Généré" / ambre "Échec")
//   - titre du diagramme
//   - aperçu (signed URL Storage, hauteur fixe)
//   - boutons "Voir en grand", "Éditer le prompt", "Régénérer"
//
// La modal d'édition de prompt préremplit la textarea avec le
// prompt_used courant. Le bouton "Régénérer avec ce prompt" envoie le
// prompt édité ; "Régénérer" simple envoie une requête sans prompt
// (réutilise le prompt précédent).

import { useEffect, useRef, useState } from 'react';
import type { DiagramsByPhase } from './ReportView';

interface DiagramsPanelProps {
  auditId: string;
  diagrams?: DiagramsByPhase;
  /** Appelé après une régénération réussie (ou échouée) pour rafraîchir
   * la page parente — l'admin recharge l'audit complet pour récupérer
   * une signed URL fraîche et la metadata mise à jour. */
  onRegenerated?: () => void;
}

export function DiagramsPanel({ auditId, diagrams, onRegenerated }: DiagramsPanelProps) {
  const entries = diagrams ? Object.entries(diagrams) : [];

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<{
    solutionId: string;
    title: string;
  } | null>(null);

  // Bust cache de l'image après régénération en ajoutant ?v=<ts>
  const [cacheBuster, setCacheBuster] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function regenerate(solutionId: string, prompt?: string) {
    setBusy((b) => ({ ...b, [solutionId]: true }));
    try {
      const res = await fetch(
        `/api/admin/audits/${encodeURIComponent(auditId)}/diagrams/${encodeURIComponent(solutionId)}/regenerate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prompt ? { prompt } : {}),
        },
      );
      const payload = (await res.json()) as {
        ok?: boolean;
        status?: 'ok' | 'failed';
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      if (payload.status === 'failed') {
        setToast({
          kind: 'error',
          text: `Échec de régénération : ${payload.error ?? 'erreur inconnue'}`,
        });
      } else {
        setToast({ kind: 'success', text: 'Diagramme régénéré.' });
        setCacheBuster((m) => ({ ...m, [solutionId]: Date.now() }));
      }
      // Dans tous les cas, la metadata a été mise à jour : on rafraîchit.
      onRegenerated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
      setToast({ kind: 'error', text: `Échec de régénération : ${msg}` });
    } finally {
      setBusy((b) => ({ ...b, [solutionId]: false }));
    }
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-4">
        <header className="mb-2">
          <h4 className="font-bold text-navy-600">
            Diagrammes — phase 1 et phase 2
          </h4>
        </header>
        <p className="text-sm italic text-muted">
          Aucun diagramme n'a été généré pour cet audit.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="font-bold text-navy-600">
          Diagrammes — phase 1 et phase 2
        </h4>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          {entries.length} diagramme{entries.length > 1 ? 's' : ''}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {entries.map(([solutionId, d]) => {
          const isBusy = !!busy[solutionId];
          const buster = cacheBuster[solutionId];
          const imgSrc =
            d.signed_url && buster
              ? `${d.signed_url}${d.signed_url.includes('?') ? '&' : '?'}v=${buster}`
              : d.signed_url;
          return (
            <article
              key={solutionId}
              className="flex flex-col gap-2 rounded-lg border border-line bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted truncate">{solutionId}</p>
                  <h5 className="font-bold text-navy-600 text-sm leading-tight">
                    {d.title}
                  </h5>
                </div>
                <StatusPill status={d.status ?? 'ok'} />
              </div>

              {d.status === 'ok' && imgSrc ? (
                <a
                  href={imgSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border border-line overflow-hidden bg-white hover:opacity-90 transition-opacity"
                  title="Cliquer pour voir en grand"
                >
                  <img
                    src={imgSrc}
                    alt={d.title}
                    className="w-full h-auto max-h-64 object-contain"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="rounded-md border border-warning/30 bg-warning-bg/30 p-3 text-xs text-navy-600">
                  <p className="font-semibold mb-1">Échec de génération</p>
                  {d.failure_reason && (
                    <p className="font-mono text-[11px] text-muted leading-snug whitespace-pre-wrap">
                      {d.failure_reason}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {d.status === 'ok' && imgSrc && (
                  <a
                    href={imgSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-cream transition-colors"
                  >
                    Voir en grand
                  </a>
                )}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    setEditing({ solutionId, title: d.title })
                  }
                  className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-cream transition-colors disabled:opacity-50"
                >
                  Éditer le prompt
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => regenerate(solutionId)}
                  className={
                    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ' +
                    (d.status === 'failed'
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'border border-line bg-white text-navy-600 hover:bg-cream')
                  }
                >
                  {isBusy ? 'Régénération…' : 'Régénérer'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          className={
            'fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ' +
            (toast.kind === 'success'
              ? 'bg-success text-white'
              : 'bg-danger text-white')
          }
        >
          {toast.text}
        </div>
      )}

      {editing && (
        <EditPromptModal
          auditId={auditId}
          solutionId={editing.solutionId}
          title={editing.title}
          onCancel={() => setEditing(null)}
          onSubmit={async (prompt) => {
            const sid = editing.solutionId;
            setEditing(null);
            await regenerate(sid, prompt);
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: 'ok' | 'failed' }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center rounded-full bg-success-bg text-success border border-success/40 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] shrink-0">
        Généré
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning-bg text-warning border border-warning/40 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] shrink-0">
      Échec
    </span>
  );
}

interface EditPromptModalProps {
  auditId: string;
  solutionId: string;
  title: string;
  onCancel: () => void;
  onSubmit: (prompt: string) => Promise<void> | void;
}

function EditPromptModal({
  auditId,
  solutionId,
  title,
  onCancel,
  onSubmit,
}: EditPromptModalProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Récupère le prompt courant via /get (qui renvoie l'audit complet
  // avec diagrams_metadata). Évite de devoir prop-drill le prompt_used
  // depuis AuditDetail jusqu'ici juste pour la modal.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/audits/${encodeURIComponent(auditId)}/get`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as {
          audit: { diagrams_metadata?: Record<string, { prompt_used?: string }> };
        };
      })
      .then((payload) => {
        if (cancelled) return;
        const meta = payload.audit?.diagrams_metadata?.[solutionId];
        setPrompt(meta?.prompt_used ?? '');
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
  }, [auditId, solutionId]);

  useEffect(() => {
    if (!loading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [loading]);

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(prompt);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-prompt-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-navy-800/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90dvh] flex flex-col">
        <header className="px-5 py-4 border-b border-line flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h3 id="edit-prompt-title" className="font-bold text-navy-600 truncate">
              Éditer le prompt — {title}
            </h3>
            <p className="font-mono text-[10px] text-muted truncate">{solutionId}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-muted hover:text-navy-600 disabled:opacity-50"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4 flex-1 overflow-y-auto flex flex-col gap-3">
          <p className="text-xs text-muted leading-relaxed">
            Les modifications du prompt sont appliquées uniquement à cette
            régénération. La planche style guide est jointe automatiquement.
          </p>
          {loading ? (
            <p className="text-sm text-muted italic">Chargement du prompt…</p>
          ) : error ? (
            <p className="text-sm text-danger">Erreur de chargement : {error}</p>
          ) : (
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={submitting}
              spellCheck={false}
              className="w-full min-h-[400px] max-h-[60dvh] rounded-lg border border-line bg-cream/40 p-3 font-mono text-[11px] leading-relaxed text-navy-600 focus:outline-none focus:border-orange-500 resize-y"
            />
          )}
        </div>

        <footer className="px-5 py-4 border-t border-line flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-cream transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || submitting || !prompt.trim()}
            className="inline-flex items-center justify-center rounded-md bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Régénération…' : 'Régénérer avec ce prompt'}
          </button>
        </footer>
      </div>
    </div>
  );
}
