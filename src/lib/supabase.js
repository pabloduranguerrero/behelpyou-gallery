import { createClient } from '@supabase/supabase-js';

// Cliente anónimo, seguro para usar en el navegador.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: { persistSession: false }
  }
);

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'wedding';
