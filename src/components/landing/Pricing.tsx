import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { buttonStyles } from '../ui';
import { Container, Reveal } from '../layout';
import { SectionLabel, SectionTitle } from './SectionPrimitives';
import { cn } from '../../lib/utils';

interface Tier {
  label: string;
  name: string;
  desc: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
}

type TierKey = 'a' | 'b' | 'c';
const TIER_KEYS: TierKey[] = ['a', 'b', 'c'];

export function Pricing() {
  const { t } = useTranslation('landing');

  return (
    <section id="tarifs" className="bg-white py-24 md:py-32">
      <Container>
        <Reveal>
          <SectionLabel>{t('pricing.label')}</SectionLabel>
          <SectionTitle className="mt-5">
            <Trans
              i18nKey="pricing.title"
              ns="landing"
              components={{ accent: <span className="text-orange-500" /> }}
            />
          </SectionTitle>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {t('pricing.sub')}
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {TIER_KEYS.map((key, idx) => {
            const tier = t(`pricing.tiers.${key}`, {
              returnObjects: true,
            }) as Tier;
            const featured = key === 'b';

            return (
              <Reveal key={key} delay={idx * 80}>
                <article
                  className={cn(
                    'relative flex h-full flex-col rounded-2xl p-10 transition-all duration-200 ease-out',
                    featured
                      ? 'bg-navy-600 text-white shadow-[0_30px_60px_-20px_rgb(15_39_68_/_0.4)] ring-2 ring-orange-500 md:scale-[1.03]'
                      : 'border border-line bg-white hover:-translate-y-1 hover:shadow-(--shadow-card-hover)',
                  )}
                >
                  {featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-500 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_4px_12px_rgb(245_125_32_/_0.4)]">
                      {t('pricing.featuredBadge')}
                    </span>
                  )}

                  <div
                    className={cn(
                      'font-mono text-[11px] font-semibold uppercase tracking-[0.1em]',
                      featured ? 'text-orange-500' : 'text-muted',
                    )}
                  >
                    {tier.label}
                  </div>

                  <h3
                    className={cn(
                      'mt-3 text-2xl font-bold tracking-[-0.02em]',
                      featured ? 'text-white' : 'text-navy-600',
                    )}
                  >
                    {tier.name}
                  </h3>

                  <p
                    className={cn(
                      'mt-2 min-h-[44px] text-sm leading-relaxed',
                      featured ? 'text-white/70' : 'text-muted',
                    )}
                  >
                    {tier.desc}
                  </p>

                  <div
                    className={cn(
                      'mt-7 text-[42px] font-bold leading-none tracking-[-0.03em]',
                      featured ? 'text-white' : 'text-navy-600',
                    )}
                  >
                    {tier.price}
                  </div>
                  <div
                    className={cn(
                      'mt-2 font-mono text-[11px] font-medium',
                      featured ? 'text-white/60' : 'text-muted',
                    )}
                  >
                    {tier.priceNote}
                  </div>

                  <ul className="mt-8 flex flex-1 flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          'flex items-start gap-2.5 text-sm',
                          featured ? 'text-white/90' : 'text-navy-600',
                        )}
                      >
                        <span className="mt-0.5 font-bold text-orange-500">
                          →
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/audit/new"
                    className={cn(
                      'mt-8 w-full justify-center text-center',
                      buttonStyles({
                        variant: featured ? 'primary' : 'ghost',
                        size: 'lg',
                      }),
                    )}
                  >
                    {tier.cta}
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
