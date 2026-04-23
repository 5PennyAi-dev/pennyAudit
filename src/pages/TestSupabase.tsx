import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { AuditTemplateRow } from '../types/database';
import { LanguageSwitcher } from '../components/ui';

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; rows: AuditTemplateRow[] }
  | { status: 'error'; message: string };

export function TestSupabase() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .order('skill_number', { ascending: true });

      if (cancelled) return;

      if (error) {
        setState({ status: 'error', message: error.message });
        return;
      }

      setState({
        status: 'success',
        rows: (data ?? []) as AuditTemplateRow[],
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle =
    i18n.language.startsWith('fr')
      ? 'Cette page exécute un SELECT sur audit_templates au chargement. Attendu : 5 lignes (une par skill).'
      : 'This page runs a SELECT on audit_templates on load. Expected: 5 rows (one per skill).';

  const heading =
    i18n.language.startsWith('fr')
      ? 'Lecture de audit_templates'
      : 'Reading audit_templates';

  const demoLabel =
    i18n.language.startsWith('fr')
      ? 'Démo i18n · clés de common.json'
      : 'i18n demo · common.json keys';

  return (
    <main className="min-h-screen bg-paper font-sans text-navy-600">
      <div className="mx-auto max-w-4xl px-8 py-24 md:px-12">
        {/* Header avec switcher */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">
            /test-supabase · sanity-check connexion DB
          </span>
          <LanguageSwitcher variant="light" />
        </div>

        <header className="mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-[-0.02em]">
            {heading.includes('audit_templates') ? (
              <>
                {heading.split('audit_templates')[0]}
                <span className="font-mono">audit_templates</span>
              </>
            ) : (
              heading
            )}
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted">
            {subtitle}
          </p>
        </header>

        {/* Démo i18n via clés de traduction */}
        <section className="mb-10 rounded-2xl border border-line bg-white p-6 shadow-(--shadow-card)">
          <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {demoLabel}
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <TranslationRow k="common.loading" v={t('common.loading')} />
            <TranslationRow k="common.error" v={t('common.error')} />
            <TranslationRow k="common.success" v={t('common.success')} />
            <TranslationRow k="common.save" v={t('common.save')} />
            <TranslationRow k="status.processing" v={t('status.processing')} />
            <TranslationRow k="status.completed" v={t('status.completed')} />
            <TranslationRow k="status.pending" v={t('status.pending')} />
            <TranslationRow k="status.failed" v={t('status.failed')} />
            <TranslationRow k="nav.startAudit" v={t('nav.startAudit')} />
            <TranslationRow k="cta.startAudit" v={t('cta.startAudit')} />
            <TranslationRow k="cta.back" v={t('cta.back')} />
            <TranslationRow k="cta.submit" v={t('cta.submit')} />
          </dl>
        </section>

        {/* Résultat requête Supabase */}
        <section>{renderState(state, t)}</section>
      </div>
    </main>
  );
}

function TranslationRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2 last:border-b-0">
      <code className="font-mono text-[11px] text-muted">{k}</code>
      <span className="font-semibold text-navy-600">{v}</span>
    </div>
  );
}

function renderState(state: LoadState, t: (key: string) => string) {
  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-sm text-muted shadow-(--shadow-card)">
        <span className="size-1.5 animate-(--animate-pulse-dot) rounded-full bg-orange-500" />
        <span className="font-mono uppercase tracking-[0.08em]">
          {t('common.loading')}…
        </span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger/5 p-6 shadow-(--shadow-card)">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
          {t('common.error')}
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-danger">
          {state.message}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-muted">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
          {state.rows.length} rows
        </span>
        <span className="font-mono text-xs">
          {state.rows.length === 5 ? 'OK · 5' : '⚠'}
        </span>
      </div>

      <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-line bg-navy-800 p-6 font-mono text-xs leading-relaxed text-white/90 shadow-(--shadow-card)">
        {JSON.stringify(state.rows, null, 2)}
      </pre>
    </div>
  );
}
