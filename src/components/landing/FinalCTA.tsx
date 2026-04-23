import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { buttonStyles } from '../ui';
import { Container, Reveal } from '../layout';

export function FinalCTA() {
  const { t } = useTranslation('landing');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-800 to-navy-600 py-24 text-center text-white md:py-32">
      {/* Radial glow central */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(245 125 32 / 0.1) 0%, transparent 60%)',
        }}
      />

      <Container className="relative">
        <Reveal>
          <h2 className="mx-auto max-w-[800px] text-[clamp(38px,5vw,60px)] font-bold leading-[1.1] tracking-[-0.025em]">
            <Trans
              i18nKey="finalCta.title"
              ns="landing"
              components={{ accent: <span className="text-orange-500" /> }}
            />
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            {t('finalCta.sub')}
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              to="/audit/new"
              className={buttonStyles({
                variant: 'primary',
                size: 'lg',
                className: 'px-8 py-4 text-base',
              })}
            >
              {t('finalCta.cta')}
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
