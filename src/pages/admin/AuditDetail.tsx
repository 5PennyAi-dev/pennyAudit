import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuditDetailHeader } from '../../components/admin/AuditDetailHeader';
import { AuditTabs, AUDIT_TABS, type AuditTabId } from '../../components/admin/AuditTabs';
import { IntakeView } from '../../components/admin/sections/IntakeView';
import { ContextView } from '../../components/admin/sections/ContextView';
import { OpportunitiesView } from '../../components/admin/sections/OpportunitiesView';
import { RisksView } from '../../components/admin/sections/RisksView';
import { StackView } from '../../components/admin/sections/StackView';
import { ReportView } from '../../components/admin/sections/ReportView';
import { ReviewEventsTimeline } from '../../components/admin/sections/ReviewEventsTimeline';
import { SectionShell, Subsection } from '../../components/admin/sections/_shared';
import { InlineNoteEditor, type NoteSection } from '../../components/admin/InlineNoteEditor';

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
      // Pas de reviewer_notes pour l'intake — c'est la donnée brute du client
      return <IntakeView data={audit.intake_data} />;
    case 'context':
      return (
        <SectionWithEditor
          auditId={audit.id}
          section="context"
          output={audit.skill_1_output}
        >
          <ContextView data={audit.skill_1_output} />
        </SectionWithEditor>
      );
    case 'opportunities':
      return (
        <SectionWithEditor
          auditId={audit.id}
          section="opportunities"
          output={audit.skill_2_output}
        >
          <OpportunitiesView data={audit.skill_2_output} />
        </SectionWithEditor>
      );
    case 'risks':
      return (
        <SectionWithEditor
          auditId={audit.id}
          section="risks"
          output={audit.skill_3_output}
        >
          <RisksView data={audit.skill_3_output} />
        </SectionWithEditor>
      );
    case 'stack':
      return (
        <SectionWithEditor
          auditId={audit.id}
          section="stack"
          output={audit.skill_4_output}
        >
          <StackView data={audit.skill_4_output} />
        </SectionWithEditor>
      );
    case 'report':
      return (
        <SectionWithEditor
          auditId={audit.id}
          section="report"
          output={audit.skill_5_output}
        >
          <ReportView data={audit.skill_5_output} />
        </SectionWithEditor>
      );
    case 'notes':
      return <NotesTabContent audit={audit} reviewEvents={reviewEvents} />;
  }
}

function extractReviewerNotes(output: unknown): string {
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const v = (output as Record<string, unknown>).reviewer_notes;
    if (typeof v === 'string') return v;
  }
  return '';
}

function SectionWithEditor({
  auditId,
  section,
  output,
  children,
}: {
  auditId: string;
  section: NoteSection;
  output: unknown;
  children: React.ReactNode;
}) {
  const initial = extractReviewerNotes(output);
  return (
    <div className="flex flex-col gap-4">
      {children}
      <InlineNoteEditor
        auditId={auditId}
        section={section}
        initialValue={initial}
      />
    </div>
  );
}

function NotesTabContent({
  audit,
  reviewEvents,
}: {
  audit: AuditRow;
  reviewEvents: ReviewEvent[];
}) {
  return (
    <SectionShell
      title="Notes & historique"
      subtitle="Note globale et journal complet des décisions"
    >
      <Subsection title="Note globale">
        <InlineNoteEditor
          auditId={audit.id}
          section="global"
          initialValue={audit.admin_notes_global ?? ''}
          label="Note globale de révision"
          minRows={4}
          maxRows={16}
        />
      </Subsection>
      <Subsection title={`Historique (${reviewEvents.length})`}>
        <ReviewEventsTimeline events={reviewEvents} />
      </Subsection>
    </SectionShell>
  );
}

export default AuditDetail;
