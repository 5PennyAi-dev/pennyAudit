import { useLocation } from 'react-router-dom';
import { Container } from '../components/layout';

export interface PlaceholderProps {
  title: string;
  description?: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  const location = useLocation();

  return (
    <div className="relative overflow-hidden bg-navy-600 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(245 125 32 / 0.08) 0%, transparent 70%)',
        }}
      />

      <Container>
        <div className="flex min-h-[calc(100vh-68px-96px)] flex-col items-center justify-center gap-6 py-24 text-center">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">
            {location.pathname}
          </span>
          <h1 className="text-[clamp(38px,5vw,64px)] font-bold leading-[1.05] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/65">
            {description ?? 'À construire'}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-white/55">
            <span className="size-1.5 rounded-full bg-orange-500 animate-(--animate-pulse-dot)" />
            Placeholder
          </span>
        </div>
      </Container>
    </div>
  );
}
