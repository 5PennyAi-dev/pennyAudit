import { useTranslation } from 'react-i18next';
import { Container } from '../layout';

export function Trust() {
  const { t } = useTranslation('landing');
  const items = t('trust.items', { returnObjects: true }) as string[];

  return (
    <section className="border-b border-line bg-cream">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-8">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {t('trust.label')}
          </span>
          <ul className="flex flex-wrap gap-x-10 gap-y-3">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm font-semibold text-navy-600"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 14 14"
                  className="size-3.5 shrink-0 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 7.5 6 10.5 11 4" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
