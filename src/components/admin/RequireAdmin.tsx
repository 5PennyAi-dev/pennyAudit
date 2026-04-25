import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; email: string }
  | { status: 'unauthenticated' };

export function RequireAdmin() {
  const location = useLocation();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth/check', {
          credentials: 'same-origin',
        });
        const data = (await res.json()) as {
          authenticated: boolean;
          email?: string;
        };
        if (cancelled) return;
        if (data.authenticated && data.email) {
          setState({ status: 'authenticated', email: data.email });
        } else {
          setState({ status: 'unauthenticated' });
        }
      } catch {
        if (!cancelled) setState({ status: 'unauthenticated' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          Vérification de la session…
        </p>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}

export default RequireAdmin;
