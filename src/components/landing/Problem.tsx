import { Trans, useTranslation } from 'react-i18next';
import { Container, Reveal } from '../layout';
import { SectionLabel, SectionTitle } from './SectionPrimitives';

interface ProblemCard {
  heading: string;
  text: string;
}

export function Problem() {
  const { t } = useTranslation('landing');
  const cards = t('problem.cards', { returnObjects: true }) as ProblemCard[];

  return (
    <section id="pourquoi" className="bg-white py-24 md:py-32">
      <Container>
        <Reveal>
          <SectionLabel>{t('problem.label')}</SectionLabel>
          <SectionTitle className="mt-5">
            <Trans
              i18nKey="problem.title"
              ns="landing"
              components={{ accent: <span className="text-orange-500" /> }}
            />
          </SectionTitle>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {t('problem.sub')}
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card, idx) => (
            <Reveal key={idx} delay={idx * 80}>
              <article className="group h-full rounded-2xl border border-line bg-cream p-9 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-orange-500 hover:shadow-(--shadow-card-hover)">
                <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-orange-500">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-5 text-xl font-bold leading-tight tracking-[-0.01em] text-navy-600 md:text-[22px]">
                  {card.heading}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  <Trans
                    i18nKey={`problem.cards.${idx}.text`}
                    ns="landing"
                    components={{ em: <em className="not-italic font-semibold text-navy-600" /> }}
                  />
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
