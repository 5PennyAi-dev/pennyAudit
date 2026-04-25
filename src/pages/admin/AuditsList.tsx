import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuditStatusBadge, type AuditStatus } from '../../components/admin/AuditStatusBadge';
import { AuditDeadline } from '../../components/admin/AuditDeadline';
import { cn } from '../../lib/utils';

interface AuditRow {
  id: string;
  status: string;
  first_name: string | null;
  email: string | null;
  industry: string | null;
  industry_other: string | null;
  business_name: string | null;
  created_at: string;
  pipeline_completed_at: string | null;
  sla_deadline: string;
  sla_overdue_seconds: number;
}

interface ListResponse {
  audits: AuditRow[];
  total: number;
  page: number;
  page_size: number;
}

const STATUS_OPTIONS: { value: AuditStatus; label: string }[] = [
  { value: 'pending_review', label: 'À réviser' },
  { value: 'running', label: 'En cours' },
  { value: 'changes_requested', label: 'Modifs demandées' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'delivered', label: 'Livré' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'error', label: 'Erreur' },
];

const SLA_INACTIVE_STATUSES = new Set(['approved', 'delivered', 'rejected']);

type SortBy = 'status' | 'client' | 'industry' | 'created_at' | 'sla';
type SortDir = 'asc' | 'desc';

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatCreatedAt(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function readStatusesFromParams(params: URLSearchParams): AuditStatus[] {
  const raw = params.get('status');
  if (raw === null) return ['pending_review']; // défaut
  if (raw === '') return []; // « tout afficher »
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is AuditStatus =>
      STATUS_OPTIONS.some((o) => o.value === s),
    );
}

export function AuditsList() {
  const [params, setParams] = useSearchParams();

  const statuses = useMemo(() => readStatusesFromParams(params), [params]);
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const sortBy = (params.get('sort_by') as SortBy) || 'created_at';
  const sortDir = (params.get('sort_dir') as SortDir) || 'desc';

  const [searchInput, setSearchInput] = useState(q);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync l'input visible si l'URL change autrement (ex: bouton reset)
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Debounce de la recherche → URL
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (searchInput === q) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput) next.set('q', searchInput);
      else next.delete('q');
      next.set('page', '1');
      setParams(next, { replace: true });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = new URL('/api/admin/audits/list', window.location.origin);
    if (statuses.length > 0) url.searchParams.set('status', statuses.join(','));
    if (q) url.searchParams.set('q', q);
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort_by', sortBy);
    url.searchParams.set('sort_dir', sortDir);

    fetch(url.toString(), { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ListResponse;
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
  }, [statuses.join(','), q, page, sortBy, sortDir]);

  const toggleStatus = useCallback(
    (s: AuditStatus) => {
      const set = new Set(statuses);
      if (set.has(s)) set.delete(s);
      else set.add(s);
      const next = new URLSearchParams(params);
      if (set.size === 0) next.set('status', '');
      else next.set('status', [...set].join(','));
      next.set('page', '1');
      setParams(next, { replace: true });
    },
    [statuses, params, setParams],
  );

  const resetFilters = useCallback(() => {
    // « Tout afficher » : status= explicite (vide) pour désactiver le défaut
    // pending_review et montrer tous les statuts.
    const next = new URLSearchParams();
    next.set('status', '');
    setParams(next, { replace: true });
  }, [setParams]);

  const setSort = useCallback(
    (col: SortBy) => {
      const next = new URLSearchParams(params);
      if (sortBy === col) {
        next.set('sort_dir', sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        next.set('sort_by', col);
        next.set('sort_dir', col === 'created_at' || col === 'sla' ? 'desc' : 'asc');
      }
      setParams(next, { replace: true });
    },
    [sortBy, sortDir, params, setParams],
  );

  const goToPage = useCallback(
    (next: number) => {
      const sp = new URLSearchParams(params);
      sp.set('page', String(next));
      setParams(sp, { replace: false });
    },
    [params, setParams],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtres */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mr-1">
            Statut
          </span>
          {STATUS_OPTIONS.map((opt) => {
            const active = statuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-navy-600 bg-navy-600 text-white'
                    : 'border-line bg-white text-navy-600 hover:bg-cream',
                )}
              >
                {opt.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-xs font-medium text-muted underline-offset-4 hover:text-navy-600 hover:underline"
          >
            Tout afficher
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Recherche par prénom ou courriel"
            className={cn(
              'h-10 flex-1 rounded-lg border-[1.5px] border-line bg-white px-4 text-sm text-navy-600 placeholder:text-muted',
              'focus:outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/20',
            )}
          />
        </div>
      </section>

      {/* Tableau */}
      <section className="rounded-2xl border border-line bg-paper overflow-hidden">
        {error && (
          <div className="px-5 py-4 bg-danger-bg text-danger text-sm border-b border-danger/40">
            Erreur : {error}. Recharge la page.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream border-b border-line">
              <tr className="text-left">
                <Th col="status" sortBy={sortBy} sortDir={sortDir} onSort={setSort}>
                  Statut
                </Th>
                <Th col="client" sortBy={sortBy} sortDir={sortDir} onSort={setSort}>
                  Client
                </Th>
                <Th col="industry" sortBy={sortBy} sortDir={sortDir} onSort={setSort}>
                  Secteur
                </Th>
                <Th col="created_at" sortBy={sortBy} sortDir={sortDir} onSort={setSort}>
                  Soumis le
                </Th>
                <Th col="sla" sortBy={sortBy} sortDir={sortDir} onSort={setSort}>
                  SLA
                </Th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-b-0 animate-pulse">
                      <td className="px-4 py-4">
                        <span className="block h-4 w-20 rounded-full bg-cream" />
                      </td>
                      <td className="px-4 py-4">
                        <span className="block h-3 w-32 rounded bg-cream" />
                        <span className="block h-3 w-44 rounded bg-cream mt-1.5" />
                      </td>
                      <td className="px-4 py-4">
                        <span className="block h-3 w-24 rounded bg-cream" />
                      </td>
                      <td className="px-4 py-4">
                        <span className="block h-3 w-28 rounded bg-cream" />
                      </td>
                      <td className="px-4 py-4">
                        <span className="block h-3 w-20 rounded bg-cream" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-block h-3 w-12 rounded bg-cream" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && data && data.audits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Aucun audit pour ces filtres.
                  </td>
                </tr>
              )}
              {data?.audits.map((row) => {
                const clientName = row.first_name ?? '—';
                const email = row.email ?? '';
                const industry =
                  row.industry === 'autre'
                    ? row.industry_other ?? 'Autre'
                    : row.industry ?? '—';
                const slaInactive = SLA_INACTIVE_STATUSES.has(row.status);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-line last:border-b-0 hover:bg-cream/60"
                  >
                    <td className="px-4 py-3 align-top">
                      <AuditStatusBadge status={row.status} pulse />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-navy-600 font-medium">{clientName}</div>
                      <div className="text-xs text-muted truncate max-w-[260px]">
                        {email}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-navy-600">{industry}</td>
                    <td className="px-4 py-3 align-top text-navy-600 font-mono text-xs">
                      {formatCreatedAt(row.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AuditDeadline
                        overdueSeconds={row.sla_overdue_seconds}
                        inactive={slaInactive}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Link
                        to={`/admin/audits/${row.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-orange-500 hover:text-orange-600 underline-offset-4 hover:underline"
                      >
                        Réviser →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line">
            <p className="text-xs text-muted">
              {data.total} audit{data.total > 1 ? 's' : ''} · page {data.page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="ghost"
                size="md"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface ThProps {
  col: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (col: SortBy) => void;
  children: React.ReactNode;
}

function Th({ col, sortBy, sortDir, onSort, children }: ThProps) {
  const active = sortBy === col;
  return (
    <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted text-left">
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-navy-600 transition-colors',
          active && 'text-navy-600',
        )}
      >
        {children}
        <span aria-hidden className={cn('text-[8px]', active ? 'opacity-100' : 'opacity-30')}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </span>
      </button>
    </th>
  );
}

export default AuditsList;
