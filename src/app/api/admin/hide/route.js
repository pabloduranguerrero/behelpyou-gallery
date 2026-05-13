import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkKey(req) {
  const key = req.headers.get('x-admin-key') || '';
  return key && key === process.env.ADMIN_KEY;
}

// Toggle hidden (no borra, sólo oculta del feed público).
export async function POST(req) {
  if (!checkKey(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { id, hidden } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const admin = getAdminClient();
    const { error } = await admin.from('wedding_items').update({ hidden: !!hidden }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
