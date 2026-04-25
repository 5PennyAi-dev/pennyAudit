import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicLayout } from './components/layout';
import { ComponentsDemo } from './pages/ComponentsDemo';
import { TestSupabase } from './pages/TestSupabase';
import { TestSearch } from './pages/TestSearch';
import { TestPage } from './pages/TestPage';
import { Placeholder } from './pages/Placeholder';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { IntakeForm, IntakeSubmitted, ResumeFromToken } from './pages/intake';
import { AuditProgress } from './pages/audit/AuditProgress';
import { AdminLogin } from './pages/admin/Login';
import { RequireAdmin } from './components/admin/RequireAdmin';
import { AdminLayout } from './layouts/AdminLayout';
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Pages publiques */}
        <Route path="/" element={<Landing />} />
        <Route path="/audit/new" element={<IntakeForm />} />
        <Route path="/intake" element={<IntakeForm />} />
        <Route path="/intake/submitted" element={<IntakeSubmitted />} />
        <Route path="/intake/resume/:token" element={<ResumeFromToken />} />
        <Route path="/audit/progress/:auditId" element={<AuditProgress />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pages de démo/test */}
        <Route path="/components-demo" element={<ComponentsDemo />} />
        <Route path="/test-supabase" element={<TestSupabase />} />
        <Route path="/test-search" element={<TestSearch />} />
        <Route path="/test" element={<TestPage />} />

        {/* Pages protégées (auth client Supabase) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/audit/:id/processing"
            element={<Placeholder title="Processing Screen" />}
          />
          <Route
            path="/audit/:id/report"
            element={<Placeholder title="Report" />}
          />
        </Route>

        <Route
          path="*"
          element={
            <Placeholder title="404" description="Cette page n'existe pas." />
          }
        />
      </Route>

      {/* Admin (auth séparée par mot de passe + cookie signé — Session 2C) */}
      {/* Hors PublicLayout : pas de Nav/Footer publics */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/audits" replace />} />
          <Route
            path="/admin/audits"
            element={
              <Placeholder
                title="Liste des audits"
                description="À venir — Étape 4 de la Session 2C."
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
