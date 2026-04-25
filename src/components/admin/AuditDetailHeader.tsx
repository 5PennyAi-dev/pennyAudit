import { Link } from 'react-router-dom';
import { AuditStatusBadge } from './AuditStatusBadge';
import { Button } from '../ui/Button';

interface AuditDetailHeaderProps {
  firstName: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  deliveredAt?: string | null;
  reviewedBy?: string | null;
}

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function fmt(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return null;
  }
}

export function AuditDetailHeader({
  firstName,
  email,
  status,
  createdAt,
  approvedAt,
  deliveredAt,
  reviewedBy,
}: AuditDetailHeaderProps) {
  const created = fmt(createdAt);
  const approved = fmt(approvedAt);
  const delivered = fmt(deliveredAt);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-600 truncate">
            {firstName ?? 'Client sans prénom'}
          </h2>
          {email && (
            <p className="mt-1 font-mono text-xs text-muted truncate">{email}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <AuditStatusBadge status={status} pulse />
          <Link to="/admin/audits">
            <Button variant="ghost" size="md">
              ← Retour
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        {created && <span>Audit lancé le {created}</span>}
        {approved && (
          <span>
            Approuvé le {approved}
            {reviewedBy ? ` par ${reviewedBy}` : ''}
          </span>
        )}
        {delivered && <span>Envoyé au client le {delivered}</span>}
      </div>

      {/* Actions principales — câblées à l'Étape 8 */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-line">
        <Button variant="primary" size="md" disabled title="Câblé à l'Étape 8">
          Approuver et envoyer
        </Button>
        <Button variant="ghost" size="md" disabled title="Câblé à l'Étape 8">
          Demander des modifications
        </Button>
        <Button variant="ghost" size="md" disabled title="Câblé à l'Étape 8">
          Rejeter
        </Button>
      </div>
    </section>
  );
}

export default AuditDetailHeader;
