import { useState } from 'react';
import { Button } from '../ui/Button';
import { RequestChangesModal } from './RequestChangesModal';
import { RejectModal } from './RejectModal';
import { ApproveAndSendModal } from './ApproveAndSendModal';

interface AuditActionsProps {
  auditId: string;
  status: string;
  publicReportToken?: string | null;
  clientFirstName?: string | null;
  clientEmail?: string | null;
  /** Appelé après une action réussie pour rafraîchir l'audit. */
  onChanged: () => void;
}

export function AuditActions({
  auditId,
  status,
  publicReportToken,
  clientFirstName,
  clientEmail,
  onChanged,
}: AuditActionsProps) {
  const [showRequest, setShowRequest] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [lastSendNotice, setLastSendNotice] = useState<string | null>(null);

  async function triggerRerun() {
    if (rerunning) return;
    setRerunning(true);
    setRerunError(null);
    try {
      const res = await fetch(`/api/audit/${auditId}/rerun`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRerunning(false);
    }
  }

  // Bandeau « Approuvé / Livré » selon statut
  if (status === 'approved' || status === 'delivered') {
    const publicUrl =
      publicReportToken && status === 'delivered'
        ? `/rapport/${publicReportToken}`
        : null;
    return (
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-line">
        <span className="font-mono text-xs text-muted">
          {status === 'delivered' ? 'Audit livré au client.' : 'Audit approuvé.'}
        </span>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-semibold text-orange-500 hover:text-orange-600 underline-offset-4 hover:underline"
          >
            Voir le rapport public ↗
          </a>
        )}
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="pt-1 border-t border-line">
        <span className="font-mono text-xs text-danger">Audit rejeté.</span>
      </div>
    );
  }

  if (status === 'changes_requested') {
    return (
      <div className="flex flex-col gap-2 pt-1 border-t border-line">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={triggerRerun} disabled={rerunning}>
            {rerunning ? 'Relance…' : 'Relancer le pipeline'}
          </Button>
          <span className="self-center font-mono text-xs text-muted">
            Modifs demandées · en attente de relance
          </span>
        </div>
        {rerunError && (
          <p className="text-xs text-danger" role="alert">
            {rerunError}
          </p>
        )}
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="pt-1 border-t border-line">
        <span className="font-mono text-xs text-navy-600">
          Pipeline en cours… rafraîchis dans quelques minutes.
        </span>
      </div>
    );
  }

  if (status === 'pending_review') {
    return (
      <>
        <div className="flex flex-col gap-2 pt-1 border-t border-line">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowApprove(true)}
            >
              Approuver et envoyer
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowRequest(true)}>
              Demander des modifications
            </Button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold bg-transparent text-danger border border-danger/40 hover:bg-danger-bg transition-colors"
            >
              Rejeter
            </button>
          </div>
          {lastSendNotice && (
            <p className="text-xs text-success">{lastSendNotice}</p>
          )}
        </div>
        <RequestChangesModal
          open={showRequest}
          onClose={() => setShowRequest(false)}
          onConfirmed={onChanged}
          auditId={auditId}
        />
        <RejectModal
          open={showReject}
          onClose={() => setShowReject(false)}
          onConfirmed={onChanged}
          auditId={auditId}
        />
        <ApproveAndSendModal
          open={showApprove}
          onClose={() => setShowApprove(false)}
          onConfirmed={(publicUrl, emailSent) => {
            setLastSendNotice(
              emailSent
                ? `Courriel envoyé · ${publicUrl}`
                : `Audit livré (mode dev — courriel non envoyé). URL : ${publicUrl}`,
            );
            onChanged();
          }}
          auditId={auditId}
          clientFirstName={clientFirstName ?? null}
          clientEmail={clientEmail ?? null}
        />
      </>
    );
  }

  // draft / error / autres
  return (
    <div className="pt-1 border-t border-line">
      <span className="font-mono text-xs text-muted">
        Aucune action disponible pour le statut « {status} ».
      </span>
    </div>
  );
}

export default AuditActions;
