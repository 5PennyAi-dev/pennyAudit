import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuditDetailHeader } from '../../components/admin/AuditDetailHeader';
import { AuditTabs, AUDIT_TABS, type AuditTabId } from '../../components/admin/AuditTabs';

interface ReviewEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  actor_email: string | null;
  created_at: string;
}

interface AuditRow {
  id: string;
  status: string;
  intake_data: Record<string, unknown> | null;
  skill_1_output: unknown;
  skill_2_output: unknown;
  skill_3_output: unknown;
  skill_4_output: unknown;
  skill_5_output: unknown;
  admin_notes_global: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  delivered_at: string | null;
  created_at: string;
  pipeline_completed_at: string | null;
}

interface GetResponse {
  audit: AuditRow;
  review_events: ReviewEvent[];
}

const VALID_TABS = new Set<AuditTabId>(AUDIT_TABS.map((t) => t.id));

function getStringField(data: Record<string, unknown> | null, key: string): string | null {
  if (!data) return null;
  const v = data[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tabParam = params.get('tab');
  const activeTab: AuditTabId = VALID_TABS.has(tabParam as AuditTabId)
    ? (tabParam as AuditTabId)
    : 'intake';

  const [data, setData] = useState<GetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/audits/${id}/get`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.status === 404) throw new Error('Audit introuvable.');
        if (res.status === 401) {
          navigate('/admin/login', { replace: true });
          throw new Error('Non authentifié.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as GetResponse;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur réseau');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  function setTab(id: AuditTabId) {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-10 text-center text-muted">
        Chargement de l'audit…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger-bg p-6 text-danger">
        {error ?? 'Erreur inconnue.'}
      </div>
    );
  }

  const { audit, review_events } = data;
  const firstName = getStringField(audit.intake_data, 'first_name');
  const email = getStringField(audit.intake_data, 'email');

  return (
    <div className="flex flex-col gap-6">
      <AuditDetailHeader
        firstName={firstName}
        email={email}
        status={audit.status}
        createdAt={audit.created_at}
        approvedAt={audit.approved_at}
        deliveredAt={audit.delivered_at}
        reviewedBy={audit.reviewed_by}
      />

      <AuditTabs active={activeTab} onChange={setTab} />

      <TabContent tab={activeTab} audit={audit} reviewEvents={review_events} />
    </div>
  );
}

interface TabContentProps {
  tab: AuditTabId;
  audit: AuditRow;
  reviewEvents: ReviewEvent[];
}

function TabContent({ tab, audit, reviewEvents }: TabContentProps) {
  switch (tab) {
    case 'intake':
      return <PlaceholderJson title="Intake" subtitle="Réponses brutes du formulaire — rendu humain à venir Étape 6." data={audit.intake_data} />;
    case 'context':
      return <PlaceholderJson title="Contexte" subtitle="Output du Skill 1 — rendu humain à venir Étape 6." data={audit.skill_1_output} />;
    case 'opportunities':
      return <PlaceholderJson title="Opportunités" subtitle="Output du Skill 2 — rendu humain à venir Étape 6." data={audit.skill_2_output} />;
    case 'risks':
      return <PlaceholderJson title="Risques" subtitle="Output du Skill 3 — rendu humain à venir Étape 6." data={audit.skill_3_output} />;
    case 'stack':
      return <PlaceholderJson title="Stack" subtitle="Output du Skill 4 — rendu humain à venir Étape 6." data={audit.skill_4_output} />;
    case 'report':
      return <PlaceholderJson title="Rapport final" subtitle="Output du Skill 5 — rendu humain à venir Étape 6." data={audit.skill_5_output} />;
    case 'notes':
      return <NotesPlaceholder audit={audit} reviewEvents={reviewEvents} />;
  }
}

function PlaceholderJson({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: unknown;
}) {
  const empty = data == null || (typeof data === 'object' && Object.keys(data as object).length === 0);
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <header className="mb-4">
        <h3 className="text-lg font-bold text-navy-600">{title}</h3>
        <p className="text-xs text-muted mt-1">{subtitle}</p>
      </header>
      {empty ? (
        <p className="text-sm text-muted italic">Pas de données disponibles pour cette section.</p>
      ) : (
        <pre className="overflow-x-auto rounded-lg border border-line bg-cream p-4 font-mono text-xs leading-relaxed text-navy-600">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}

function NotesPlaceholder({
  audit,
  reviewEvents,
}: {
  audit: AuditRow;
  reviewEvents: ReviewEvent[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6 flex flex-col gap-6">
      <header>
        <h3 className="text-lg font-bold text-navy-600">Notes & historique</h3>
        <p className="text-xs text-muted mt-1">
          Édition de la note globale et historique complet — édition câblée à l'Étape 7,
          rendu enrichi à l'Étape 6.
        </p>
      </header>

      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-2">
          Note globale (admin_notes_global)
        </h4>
        <div className="rounded-lg border border-line bg-cream p-4 text-sm text-navy-600 whitespace-pre-wrap min-h-[3rem]">
          {audit.admin_notes_global || (
            <span className="text-muted italic">Aucune note pour l'instant.</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-2">
          Historique ({reviewEvents.length})
        </h4>
        {reviewEvents.length === 0 ? (
          <p className="text-sm text-muted italic">Aucun événement enregistré.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reviewEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-col gap-1 rounded-lg border border-line bg-cream/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-500">
                    {ev.event_type}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(ev.created_at).toLocaleString('fr-CA')}
                  </span>
                  {ev.actor_email && (
                    <span className="text-xs text-muted">· {ev.actor_email}</span>
                  )}
                </div>
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <pre className="overflow-x-auto font-mono text-xs text-navy-600">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default AuditDetail;
