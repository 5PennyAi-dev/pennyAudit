import { Trans, useTranslation } from 'react-i18next';
import { Container, Reveal } from '../layout';
import { Badge } from '../ui';
import { SectionLabel, SectionTitle } from './SectionPrimitives';
import { cn } from '../../lib/utils';

interface Step {
  title: string;
  desc: string;
  time: string;
}

interface OppStat {
  label: string;
  value: string;
}

interface Opp {
  tag: string;
  tagVariant: 'primary' | 'secondary';
  name: string;
  desc: string;
  stats: OppStat[];
}

// L'étape active = la 2e (celle où "le système analyse")
const CURRENT_STEP_INDEX = 1;

export function How() {
  const { t } = useTranslation('landing');
  const steps = t('how.steps', { returnObjects: true }) as Step[];
  const sampleOpps = t('how.sample.opportunities', {
    returnObjects: true,
  }) as Opp[];

  return (
    <section
      id="comment"
      className="border-y border-line bg-cream py-24 md:py-32"
    >
      <Container>
        <Reveal>
          <SectionLabel>{t('how.label')}</SectionLabel>
          <SectionTitle className="mt-5">
            <Trans
              i18nKey="how.title"
              ns="landing"
              components={{ accent: <span className="text-orange-500" /> }}
            />
          </SectionTitle>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {t('how.sub')}
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-20">
          {/* ─── Timeline ─── */}
          <ol className="flex flex-col gap-12">
            {steps.map((step, idx) => {
              const isCurrent = idx === CURRENT_STEP_INDEX;
              return (
                <Reveal key={idx} delay={idx * 80}>
                  <li
                    className={cn(
                      'relative border-l-2 pl-7',
                      isCurrent ? 'border-orange-500' : 'border-line',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute -left-4 top-0 inline-flex size-[30px] items-center justify-center rounded-full border-2 bg-white font-mono text-xs font-bold',
                        isCurrent
                          ? 'border-orange-500 bg-orange-500 text-white shadow-[0_0_0_5px_rgb(245_125_32_/_0.15)]'
                          : 'border-line text-muted',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-navy-600">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">
                      {step.desc}
                    </p>
                    <span className="mt-3 inline-block rounded bg-orange-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-orange-500">
                      {step.time}
                    </span>
                  </li>
                </Reveal>
              );
            })}
          </ol>

          {/* ─── Sample rapport ─── */}
          <Reveal delay={160}>
            <div className="rounded-2xl border border-line bg-white p-8 shadow-(--shadow-card) md:sticky md:top-24">
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {t('how.sample.label')}
              </div>
              <h4 className="mt-4 text-xl font-bold leading-tight tracking-[-0.01em] text-navy-600">
                {t('how.sample.heading')}
              </h4>

              {sampleOpps.map((opp, idx) => (
                <div
                  key={idx}
                  className="mt-5 border-t border-line pt-5 first-of-type:mt-6"
                >
                  <Badge
                    variant={
                      opp.tagVariant === 'primary' ? 'tag-primary' : 'tag-secondary'
                    }
                    className="mb-3 rounded px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]"
                  >
                    {opp.tag}
                  </Badge>
                  <div className="text-[17px] font-bold text-navy-600">
                    {opp.name}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {opp.desc}
                  </p>
                  <dl className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2">
                    {opp.stats.map((stat) => (
                      <div key={stat.label}>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                          {stat.label}
                        </dt>
                        <dd className="mt-0.5 text-[15px] font-bold tracking-[-0.01em] text-navy-600">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
