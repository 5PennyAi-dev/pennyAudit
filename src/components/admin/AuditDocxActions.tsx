// Bandeau « Rapport DOCX » dans la page détail admin.
//
// Trois états :
//   - DOCX absent          → bouton « Générer DOCX » + texte muted
//   - DOCX présent         → boutons « Télécharger » (primaire) +
//                            « Régénérer » (ghost) + indicateur de fraîcheur
//   - Génération en cours  → bouton disabled + spinner
//
// Toasts inline (succès / erreur) sous les boutons.
//
// Utilise deux endpoints :
//   POST /api/admin/audits/[id]/generate-docx   (génère + retourne signed_url)
//   GET  /api/admin/audits/[id]/docx-url        (signe une URL fraîche)

import { useState } from 'react';
import { Button } from '../ui/Button';

interface AuditDocxActionsProps {
  auditId: string;
  docxStoragePath: string | null;
  docxGeneratedAt: string | null;
  /** Appelé après une génération/régénération réussie pour rafraîchir l'audit. */
  onChanged: () => void;
}

function formatFreshness(iso: string | null): string {
  if (!iso) return 'Aucun DOCX généré pour le moment';
  const generated = new Date(iso);
  if (Number.isNaN(generated.getTime())) return 'Aucun DOCX généré pour le moment';
  const diffMs = Date.now() - generated.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Généré à l'instant";
  if (diffMin < 60) return `Généré il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Généré il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `Généré il y a ${diffD} j`;
}

async function triggerDownload(url: string) {
  // Ouverture dans un nouvel onglet : déclenche le téléchargement direct
  // grâce au content-type docx du blob signé.
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noreferrer noopener';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function AuditDocxActions({
  auditId,
  docxStoragePath,
  docxGeneratedAt,
  onChanged,
}: AuditDocxActionsProps) {
  const [busy, setBusy] = useState<'idle' | 'generating' | 'downloading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasDocx = !!docxStoragePath;

  async function handleGenerate(isRegen: boolean) {
    if (busy !== 'idle') return;
    setBusy('generating');
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/generate-docx`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const sizeKb = body.size_bytes ? `${(body.size_bytes / 1024).toFixed(1)} Ko` : '';
      setSuccess(
        `${isRegen ? 'Régénéré' : 'Généré'}${sizeKb ? ` · ${sizeKb}` : ''}.`,
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération.');
    } finally {
      setBusy('idle');
    }
  }

  async function handleDownload() {
    if (busy !== 'idle' || !hasDocx) return;
    setBusy('downloading');
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/docx-url`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if (!body.signed_url) {
        throw new Error('URL signée absente de la réponse.');
      }
      await triggerDownload(body.signed_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de téléchargement.');
    } finally {
      setBusy('idle');
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-orange-500">
            Rapport DOCX
          </h3>
          <p className="mt-1 text-sm text-muted">
            {formatFreshness(docxGeneratedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDocx ? (
            <>
              <Button
                variant="primary"
                size="md"
                onClick={handleDownload}
                disabled={busy !== 'idle'}
              >
                {busy === 'downloading' ? 'Préparation…' : 'Télécharger DOCX'}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => handleGenerate(true)}
                disabled={busy !== 'idle'}
              >
                {busy === 'generating' ? 'Régénération…' : 'Régénérer'}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleGenerate(false)}
              disabled={busy !== 'idle'}
            >
              {busy === 'generating' ? 'Génération…' : 'Générer DOCX'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-xs text-success">{success}</p>
      )}
    </section>
  );
}

export default AuditDocxActions;
