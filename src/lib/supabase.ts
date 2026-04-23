import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    'VITE_SUPABASE_URL est manquant. Copie .env.example vers .env et renseigne la valeur.',
  );
}

if (!anonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY est manquant. Copie .env.example vers .env et renseigne la valeur.',
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
