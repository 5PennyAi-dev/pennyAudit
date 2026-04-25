import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/admin/audits';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) {
        setError('Trop de tentatives. Réessaie dans quelques minutes.');
        return;
      }
      if (!res.ok) {
        setError('Mot de passe incorrect.');
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white border border-line shadow-(--shadow-card) p-8 sm:p-10">
          <div className="mb-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-orange-500 mb-3">
              Espace admin · 5PennyAi
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-600 leading-tight">
              Révision des audits
            </h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Saisis le mot de passe admin pour accéder à la liste des audits
              en attente de révision.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              disabled={submitting}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || password.length === 0}
              className="w-full"
            >
              {submitting ? 'Vérification…' : 'Se connecter'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Accès réservé. Cette page n'est pas destinée aux clients 5PennyAi.
        </p>
      </div>
    </main>
  );
}

export default AdminLogin;
