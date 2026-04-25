import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AdminEnvBadge } from './AdminEnvBadge';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
}

export function AdminHeader({ title, subtitle, onToggleSidebar }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore — on redirige quand même
    } finally {
      navigate('/admin/login', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-paper border-b border-line">
      <div className="flex items-center gap-4 px-4 sm:px-6 py-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Ouvrir la navigation"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-navy-600 hover:bg-cream"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-navy-600 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <AdminEnvBadge />
          <Button
            variant="ghost"
            size="md"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
