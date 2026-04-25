import { cn } from '../../lib/utils';

type EnvKind = 'local' | 'preview' | 'prod';

function detectEnv(): EnvKind {
  // VITE_ENV permet de forcer manuellement (ex: 'preview' sur staging)
  const explicit = (import.meta.env.VITE_ENV ?? '').toLowerCase();
  if (explicit === 'prod' || explicit === 'production') return 'prod';
  if (explicit === 'preview' || explicit === 'staging') return 'preview';
  if (explicit === 'local' || explicit === 'dev' || explicit === 'development') return 'local';

  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('vercel.app') || host.includes('preview')) return 'preview';
    }
    return 'prod';
  }
  return 'local';
}

const labels: Record<EnvKind, string> = {
  local: 'LOCAL',
  preview: 'PREVIEW',
  prod: 'PROD',
};

const styles: Record<EnvKind, string> = {
  local: 'bg-cream text-muted border-line',
  preview: 'bg-warning-bg text-warning border-warning/40',
  prod: 'bg-danger-bg text-danger border-danger/40',
};

export function AdminEnvBadge() {
  const env = detectEnv();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-semibold uppercase tracking-[0.1em]',
        styles[env],
      )}
      title="Environnement de déploiement"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          env === 'prod' ? 'bg-danger' : env === 'preview' ? 'bg-warning' : 'bg-muted',
        )}
      />
      {labels[env]}
    </span>
  );
}

export default AdminEnvBadge;
