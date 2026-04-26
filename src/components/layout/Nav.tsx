import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher, buttonStyles } from '../ui';
import { Container } from './Container';
import { cn } from '../../lib/utils';

interface NavItem {
  key: 'why' | 'how' | 'pricing' | 'examples';
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'why', href: '/#pourquoi' },
  { key: 'how', href: '/#comment' },
  { key: 'pricing', href: '/#tarifs' },
  { key: 'examples', href: '/#exemples' },
];

export function Nav() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full text-white transition-[background-color,backdrop-filter,border-color] duration-200',
        scrolled
          ? 'bg-navy-600/85 backdrop-blur-md border-b border-white/10'
          : 'bg-navy-600 border-b border-white/5',
      )}
    >
      <Container as="nav" aria-label="Navigation principale">
        <div className="flex h-[68px] items-center justify-between gap-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-0.5 font-sans text-xl font-bold tracking-[-0.02em] text-white"
          >
            <span>5Penny</span>
            <span className="text-orange-500">Ai</span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-9 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  className="text-sm font-medium text-white/75 transition-colors hover:text-white"
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Desktop right */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              to="/admin/login"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Admin
            </Link>
            <LanguageSwitcher variant="dark" />
            <Link to="/audit/new" className={buttonStyles({ variant: 'primary' })}>
              {t('nav.startAudit')}
            </Link>
          </div>

          {/* Mobile right */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              to="/admin/login"
              className="text-xs text-white/55 transition-colors hover:text-white"
            >
              Admin
            </Link>
            <LanguageSwitcher variant="dark" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              className="inline-flex size-10 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-[3px] focus-visible:ring-orange-500/40"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </Container>

      <MobileDrawer open={open} onClose={() => setOpen(false)} />
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      id="mobile-drawer"
      aria-hidden={!open}
      className={cn(
        'fixed inset-0 z-40 md:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-navy-900/60 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.startAudit')}
        className={cn(
          'absolute right-0 top-0 flex h-full w-[min(360px,88%)] flex-col bg-navy-600 text-white shadow-2xl transition-transform duration-250 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="inline-flex size-10 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-[3px] focus-visible:ring-orange-500/40"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <Link
                to={item.href}
                onClick={onClose}
                className="block rounded-lg px-3 py-3 text-lg font-semibold text-white/90 transition-colors hover:bg-white/5 hover:text-white"
              >
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t border-white/10 p-4">
          <Link
            to="/audit/new"
            onClick={onClose}
            className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full' })}
          >
            {t('nav.startAudit')}
          </Link>
        </div>
      </div>
    </div>
  );
}
