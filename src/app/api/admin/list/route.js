import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkKey(req) {
  const key = req.headers.get('x-admin-key') || '';
  return key && key === process.env.ADMIN_KEY;
}

export async function POST(req) {
  if (!checkKey(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { slug } = await req.json();
    const admin = getAdminClient();
    let q = admin.from('wedding_items').select('*').order('created_at', { ascending: false });
    if (slug) q = q.eq('event_slug', slug);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
