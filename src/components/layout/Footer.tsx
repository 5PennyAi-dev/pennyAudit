import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from './Container';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/5 bg-navy-800 text-white/50">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4 py-10 font-mono text-[13px] tracking-[0.02em]">
          <span>{t('footer.copyright')}</span>
          <nav aria-label="Liens secondaires" className="flex items-center gap-6">
            <Link
              to="/contact"
              className="transition-colors hover:text-white"
            >
              {t('footer.contact')}
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-white"
            >
              {t('footer.terms')}
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-white"
            >
              {t('footer.privacy')}
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
