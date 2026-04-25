import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  to?: string;
  disabled?: boolean;
  hint?: string;
}

const items: NavItem[] = [
  { label: 'Audits', to: '/admin/audits' },
  { label: 'Coûts', disabled: true, hint: 'À venir' },
  { label: 'Patterns', disabled: true, hint: 'À venir' },
  { label: 'Paramètres', disabled: true, hint: 'À venir' },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  return (
    <>
      {/* Backdrop mobile */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-navy-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 bg-navy-600 text-white',
          'flex flex-col transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0 lg:z-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Navigation admin"
      >
        <div className="flex items-center gap-2 px-6 pt-7 pb-6">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-500">
            5PennyAi
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
            · Admin
          </span>
        </div>

        <nav className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.label}>
                {item.disabled || !item.to ? (
                  <span
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      'text-sm font-medium text-white/40 cursor-not-allowed',
                    )}
                    title={item.hint}
                  >
                    <span>{item.label}</span>
                    {item.hint && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/30">
                        {item.hint}
                      </span>
                    )}
                  </span>
                ) : (
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        'hover:bg-white/10',
                        isActive
                          ? 'bg-orange-500 text-white hover:bg-orange-500'
                          : 'text-white/85',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-6 py-5 border-t border-white/10">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
            Session 2C · MVP
          </p>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
