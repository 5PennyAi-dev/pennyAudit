import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert } from '../components/ui';
import { Container } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

interface LocationState {
  from?: { pathname: string };
}

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message.toLowerCase().includes('invalid')) {
        setError(t('auth.errors.invalidCredentials'));
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative bg-cream py-20 md:py-28">
      {/* Accent orange diffus en haut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgb(245 125 32 / 0.08) 0%, transparent 60%)',
        }}
      />

      <Container className="relative">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-50 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
              <LockIcon />
              5PennyAi · Auth
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.02em] text-navy-600">
              {t('auth.loginTitle')}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {t('auth.loginSub')}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-line bg-white p-8 shadow-(--shadow-card)"
            noValidate
          >
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full justify-center"
            >
              {submitting ? t('auth.submitting') : t('auth.loginCta')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('auth.noAccount')}{' '}
            <Link
              to="/signup"
              className="font-semibold text-orange-500 underline-offset-4 hover:underline"
            >
              {t('auth.createAccount')}
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6.5" width="8" height="6" rx="1.2" />
      <path d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
