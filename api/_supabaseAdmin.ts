import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL / VITE_SUPABASE_URL manquant côté serveur.');
  if (!serviceRole) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant côté serveur.');

  cached = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function parseJsonBody<T = unknown>(
  body: unknown,
): T | null {
  if (body == null) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return null;
    }
  }
  return body as T;
}
