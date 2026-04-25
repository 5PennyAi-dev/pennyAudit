import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface ApproveAndSendModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: (publicUrl: string, emailSent: boolean) => void;
  auditId: string;
  clientFirstName: string | null;
  clientEmail: string | null;
}

export function ApproveAndSendModal({
  open,
  onClose,
  onConfirmed,
  auditId,
  clientFirstName,
  clientEmail,
}: ApproveAndSendModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/approve-and-send`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        public_url?: string;
        email_sent?: boolean;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onConfirmed(body.public_url ?? '', body.email_sent ?? false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approuver et envoyer ?"
      description="L'audit sera marqué livré et le client recevra un courriel avec le lien vers son rapport."
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-cream p-4 text-sm">
          <p className="text-navy-600">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted block mb-1">
              Destinataire
            </span>
            {clientFirstName ? `${clientFirstName} — ` : ''}
            {clientEmail ?? (
              <span className="text-danger italic">aucun courriel client</span>
            )}
          </p>
        </div>
        <p className={cn('text-sm', clientEmail ? 'text-muted' : 'text-warning')}>
          {clientEmail
            ? 'Le lien vers le rapport sera valide 90 jours. Cette action est irréversible (statut delivered).'
            : 'Aucune adresse de courriel — le rapport sera marqué livré mais aucun courriel ne sera envoyé. À envoyer manuellement.'}
        </p>
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Envoi…' : 'Approuver et envoyer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ApproveAndSendModal;
