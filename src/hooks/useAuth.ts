import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../lib/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un <AuthProvider>.');
  }
  return ctx;
}
