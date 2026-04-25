import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  auditId: string;
}

export function RejectModal({ open, onClose, onConfirmed, auditId }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim() || !confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/${auditId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason: reason.trim(), confirmed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setReason('');
      setConfirmed(false);
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
      title="Rejeter cet audit"
      description="L'audit ne sera pas livré au client. Action exceptionnelle."
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Raison du rejet
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            required
            placeholder="Pourquoi cet audit ne sera pas livré ?"
            className={cn(
              'rounded-lg border-[1.5px] border-line bg-white px-3 py-2 text-sm',
              'text-navy-600 placeholder:text-muted leading-relaxed',
              'focus:outline-none focus:border-danger focus:ring-[3px] focus:ring-danger/20',
            )}
          />
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-line text-danger focus:ring-danger/40"
          />
          <span className="text-sm text-navy-600">
            Je confirme que cet audit ne sera pas livré au client.
          </span>
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim() || !confirmed || submitting}
            className={cn(
              'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold',
              'bg-danger text-white hover:bg-danger/90',
              'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-danger/40',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {submitting ? 'Envoi…' : 'Rejeter définitivement'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default RejectModal;
