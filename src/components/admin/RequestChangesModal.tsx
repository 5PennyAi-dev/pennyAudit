import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface RequestChangesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  auditId: string;
}

export function RequestChangesModal({
  open,
  onClose,
  onConfirmed,
  auditId,
}: RequestChangesModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setReason('');
      onConfirmed();
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
      title="Demander des modifications"
      description="L'audit repassera en statut « modifs demandées ». Tu pourras ensuite relancer le pipeline."
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Que faut-il modifier ?
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            required
            placeholder="Décris précisément ce qui doit changer dans l'audit…"
            className={cn(
              'rounded-lg border-[1.5px] border-line bg-white px-3 py-2 text-sm',
              'text-navy-600 placeholder:text-muted leading-relaxed',
              'focus:outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/20',
            )}
          />
        </label>
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Envoi…' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RequestChangesModal;
