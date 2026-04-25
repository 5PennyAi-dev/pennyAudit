import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminSidebar } from '../components/admin/AdminSidebar';

const titleByPath: Array<{ match: RegExp; title: string; subtitle?: string }> = [
  { match: /^\/admin\/audits\/[^/]+/, title: 'Révision d\'un audit' },
  { match: /^\/admin\/audits\/?$/, title: 'Audits', subtitle: 'Liste des audits à réviser' },
  { match: /^\/admin\/?$/, title: 'Admin' },
];

function resolveTitle(pathname: string): { title: string; subtitle?: string } {
  for (const entry of titleByPath) {
    if (entry.match.test(pathname)) {
      return { title: entry.title, subtitle: entry.subtitle };
    }
  }
  return { title: 'Admin' };
}

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { title, subtitle } = resolveTitle(location.pathname);

  return (
    <div className="min-h-dvh flex bg-cream">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
