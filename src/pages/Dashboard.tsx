import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, buttonStyles } from '../components/ui';
import { Container } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0];

  const onSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-paper py-20 md:py-24">
      <Container>
        <div className="flex flex-col gap-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-8">
            <div>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">
                /dashboard
              </span>
              <h1 className="mt-3 text-[clamp(32px,3.5vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-navy-600">
                {displayName
                  ? t('auth.dashboard.greeting', { name: displayName })
                  : t('auth.dashboard.greetingFallback')}
              </h1>
              {user?.email && (
                <p className="mt-2 font-mono text-xs text-muted">
                  {user.email}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={onSignOut}
              disabled={loggingOut}
            >
              {loggingOut ? t('auth.submitting') : t('auth.signOut')}
            </Button>
          </header>

          <section className="rounded-2xl border border-line bg-white p-12 text-center shadow-(--shadow-card)">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-cream">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <p className="mt-5 text-base text-muted">
              {t('auth.dashboard.empty')}
            </p>
            <Link
              to="/audit/new"
              className={buttonStyles({ variant: 'primary', size: 'lg', className: 'mt-6' })}
            >
              {t('auth.dashboard.emptyCta')}
            </Link>
          </section>
        </div>
      </Container>
    </div>
  );
}
