import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert } from '../components/ui';
import { Container } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    fullName?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const next: typeof fieldErrors = {};
    if (!fullName.trim()) next.fullName = t('auth.errors.nameRequired');
    if (password.length < 8) next.password = t('auth.errors.passwordTooShort');
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await signUp(email, password, { fullName: fullName.trim(), language });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message === 'profileCreateFailed') {
        setError(t('auth.errors.profileCreateFailed'));
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative bg-cream py-20 md:py-28">
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
              <SparkIcon />
              5PennyAi · Inscription
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.02em] text-navy-600">
              {t('auth.signupTitle')}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {t('auth.signupSub')}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-line bg-white p-8 shadow-(--shadow-card)"
            noValidate
          >
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label={t('auth.fullName')}
              type="text"
              autoComplete="name"
              required
              placeholder={t('auth.fullNamePlaceholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName}
            />

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              helperText={!fieldErrors.password ? t('auth.passwordHint') : undefined}
            />

            <fieldset>
              <legend className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {t('auth.language')}
              </legend>
              <div
                role="radiogroup"
                className="inline-flex items-center gap-0.5 rounded-lg border border-line p-1"
              >
                {(['fr', 'en'] as const).map((lng) => {
                  const active = language === lng;
                  return (
                    <button
                      key={lng}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setLanguage(lng)}
                      className={cn(
                        'rounded-md px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.05em] transition-colors',
                        active
                          ? 'bg-navy-600 text-white'
                          : 'text-muted hover:text-navy-600',
                      )}
                    >
                      {lng}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full justify-center"
            >
              {submitting ? t('auth.submitting') : t('auth.signupCta')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t('auth.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-semibold text-orange-500 underline-offset-4 hover:underline"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="size-3"
      fill="currentColor"
    >
      <path d="M7 1.5L8.2 5.3L12 6.5L8.2 7.7L7 11.5L5.8 7.7L2 6.5L5.8 5.3z" />
    </svg>
  );
}
