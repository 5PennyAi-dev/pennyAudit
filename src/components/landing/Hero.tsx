import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Badge, buttonStyles } from '../ui';
import { Container } from '../layout';
import { AuditCard } from '../audit/AuditCard';
import type { AuditCardStep } from '../audit/AuditCard';

const STEP_STATES: AuditCardStep['state'][] = [
  'done',
  'done',
  'active',
  'pending',
  'pending',
];

export function Hero() {
  const { t } = useTranslation('landing');
  const steps = t('hero.auditCard.steps', { returnObjects: true }) as Array<{
    label: string;
    time: string;
  }>;
  const auditSteps: AuditCardStep[] = steps.map((s, i) => ({
    ...s,
    state: STEP_STATES[i],
  }));

  const stats = [
    t('hero.stats.time', { returnObjects: true }) as {
      value: string;
      label: string;
    },
    t('hero.stats.opportunities', { returnObjects: true }) as {
      value: string;
      label: string;
    },
    t('hero.stats.pages', { returnObjects: true }) as {
      value: string;
      label: string;
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-600 to-navy-800 text-white">
      {/* Glow orange top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-52 -right-52 size-[700px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(245 125 32 / 0.08) 0%, transparent 70%)',
        }}
      />
      {/* Filet orange bas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgb(245 125 32 / 0.4), transparent)',
        }}
      />

      <Container className="relative pt-20 pb-24 md:pt-24 md:pb-28">
        <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-[1.2fr_1fr] md:gap-20">
          {/* ─── Texte ─── */}
          <div>
            <Badge variant="eyebrow" withDot>
              {t('hero.eyebrow')}
            </Badge>

            <h1 className="mt-7 text-[clamp(42px,5.2vw,68px)] font-bold leading-[1.05] tracking-[-0.03em]">
              <Trans
                i18nKey="hero.title"
                ns="landing"
                components={{ accent: <span className="text-orange-500" /> }}
              />
            </h1>

            <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-white/75">
              {t('hero.sub')}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/audit/new"
                className={buttonStyles({ variant: 'primary', size: 'lg' })}
              >
                {t('hero.primaryCta')}
              </Link>
              <Link
                to="/components-demo"
                className={buttonStyles({ variant: 'ghost-dark', size: 'lg' })}
              >
                {t('hero.secondaryCta')}
              </Link>
            </div>

            {/* Stats */}
            <dl className="mt-12 flex flex-wrap gap-x-14 gap-y-6 border-t border-white/10 pt-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <div className="text-4xl font-bold tracking-[-0.02em] text-orange-500">
                      {stat.value}
                    </div>
                    <div className="mt-1.5 text-xs font-medium text-white/60">
                      {stat.label}
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ─── Audit card ─── */}
          <div>
            <AuditCard
              label={t('hero.auditCard.label')}
              clientName={t('hero.auditCard.client')}
              statusLabel={t('hero.auditCard.status')}
              steps={auditSteps}
              progressValue={60}
              progressLabel={t('hero.auditCard.progressLabel')}
              etaLabel={t('hero.auditCard.eta')}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
