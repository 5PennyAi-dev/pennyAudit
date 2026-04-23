import { useState, type FormEvent } from 'react';
import { Alert, Button } from '../components/ui';
import { Container } from '../components/layout';
import { searchPatterns, type MatchedPattern } from '../lib/patterns';
import { cn } from '../lib/utils';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; query: string; results: MatchedPattern[]; ms: number };

const EXAMPLE_QUERIES = [
  'Je suis plombier et je rate trop d\'appels',
  'Je passe mes soirées à répondre aux courriels',
  'Je veux publier du contenu sur Instagram',
];

export function TestSearch() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = async (q: string) => {
    if (!q.trim()) return;
    setState({ status: 'loading' });
    const t0 = performance.now();
    try {
      const results = await searchPatterns(q, { threshold: 0.3, limit: 10 });
      setState({
        status: 'success',
        query: q,
        results,
        ms: Math.round(performance.now() - t0),
      });
    } catch (err) {
      setState({
        status: 'error',
        message: (err as Error).message || 'Erreur inconnue',
      });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(query);
  };

  return (
    <div className="bg-paper py-20 md:py-24">
      <Container>
        <header className="mb-10 space-y-4">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">
            /test-search · recherche vectorielle
          </span>
          <h1 className="text-[clamp(32px,3.5vw,44px)] font-bold leading-tight tracking-[-0.025em] text-navy-600">
            Embedding Voyage → <span className="font-mono">match_patterns</span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
            Saisis une phrase en langage naturel. L'app envoie la query à{' '}
            <code className="font-mono text-navy-600">/api/embed</code>{' '}
            (Voyage AI, <code className="font-mono">input_type=query</code>),
            puis Supabase retourne les patterns classés par similarité
            cosinus via pgvector.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-start">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex : Je passe mes soirées à répondre aux courriels"
            rows={2}
            className="flex-1 resize-y rounded-lg border-[1.5px] border-line bg-white px-4 py-3 text-base text-navy-600 placeholder:text-muted transition-colors focus:border-orange-500 focus:outline-none focus:ring-[3px] focus:ring-orange-500/20"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={state.status === 'loading' || !query.trim()}
            className="shrink-0"
          >
            {state.status === 'loading' ? 'Recherche…' : 'Rechercher'}
          </Button>
        </form>

        {/* Raccourcis exemples */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Exemples :
          </span>
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                run(q);
              }}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted transition-colors hover:border-orange-500 hover:text-navy-600"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Résultats */}
        <section className="mt-12">
          {state.status === 'error' && (
            <Alert variant="error" heading="Recherche échouée">
              {state.message}
            </Alert>
          )}

          {state.status === 'loading' && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-sm text-muted shadow-(--shadow-card)">
              <span className="size-1.5 animate-(--animate-pulse-dot) rounded-full bg-orange-500" />
              <span className="font-mono uppercase tracking-[0.08em]">
                Embedding + match_patterns…
              </span>
            </div>
          )}

          {state.status === 'success' && (
            <>
              <div className="mb-6 flex items-center justify-between border-b border-line pb-3 text-muted">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {state.results.length} résultat
                  {state.results.length > 1 ? 's' : ''}
                </span>
                <span className="font-mono text-xs">{state.ms} ms</span>
              </div>

              {state.results.length === 0 ? (
                <Alert variant="info" heading="Aucun résultat">
                  Essaie d'abaisser le threshold ou reformule la query.
                </Alert>
              ) : (
                <ol className="space-y-4">
                  {state.results.map((r, idx) => (
                    <ResultCard key={r.id} rank={idx + 1} pattern={r} />
                  ))}
                </ol>
              )}
            </>
          )}
        </section>
      </Container>
    </div>
  );
}

function ResultCard({
  rank,
  pattern,
}: {
  rank: number;
  pattern: MatchedPattern;
}) {
  const pct = Math.round(pattern.similarity * 100);
  const scoreColor =
    pct >= 70
      ? 'text-success'
      : pct >= 55
        ? 'text-orange-500'
        : 'text-muted';

  return (
    <li className="rounded-2xl border border-line bg-white p-6 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold text-muted">
              #{String(rank).padStart(2, '0')}
            </span>
            {pattern.category && (
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-600">
                {pattern.category}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-lg font-bold tracking-[-0.01em] text-navy-600">
            {pattern.title_fr}
          </h3>
          <code className="mt-1 block font-mono text-[11px] text-muted">
            {pattern.id}
          </code>
        </div>
        <div className="text-right">
          <div className={cn('font-mono text-2xl font-bold tabular-nums', scoreColor)}>
            {pct}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            similarity
          </div>
        </div>
      </header>

      <details className="mt-4 group">
        <summary className="cursor-pointer list-none font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:text-navy-600">
          <span className="inline-block transition-transform group-open:rotate-90">
            ▸
          </span>{' '}
          Raw content JSON
        </summary>
        <pre className="mt-3 max-h-[400px] overflow-auto rounded-lg border border-line bg-navy-800 p-4 font-mono text-xs leading-relaxed text-white/90">
          {JSON.stringify(pattern.content, null, 2)}
        </pre>
      </details>
    </li>
  );
}
