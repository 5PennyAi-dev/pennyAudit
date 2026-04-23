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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pages de démo/test */}
        <Route path="/components-demo" element={<ComponentsDemo />} />
        <Route path="/test-supabase" element={<TestSupabase />} />
        <Route path="/test-search" element={<TestSearch />} />
        <Route path="/test" element={<TestPage />} />

        {/* Pages protégées */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Placeholder title="Admin Dashboard" />} />
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
    </Routes>
  );
}

export default App;
