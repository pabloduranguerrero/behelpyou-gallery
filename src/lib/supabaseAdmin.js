import { createClient } from '@supabase/supabase-js';

// Cliente con SERVICE_ROLE_KEY: SOLO debe usarse desde rutas server (API routes).
// NUNCA expongas estas claves al navegador.
let cached = null;

export function getAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.'
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'wedding';
