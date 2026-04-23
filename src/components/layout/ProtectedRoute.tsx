import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Container } from './Container';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Container className="py-24">
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted">
          <span className="size-1.5 animate-(--animate-pulse-dot) rounded-full bg-orange-500" />
          <span className="font-mono text-xs uppercase tracking-[0.1em]">
            Chargement…
          </span>
        </div>
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
