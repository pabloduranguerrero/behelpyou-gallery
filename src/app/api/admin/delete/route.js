import { NextResponse } from 'next/server';
import { getAdminClient, STORAGE_BUCKET } from '@/lib/supabaseAdmin';

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
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const admin = getAdminClient();
    const { data: item } = await admin.from('wedding_items').select('*').eq('id', id).maybeSingle();
    if (item?.storage_path) {
      await admin.storage.from(STORAGE_BUCKET).remove([item.storage_path]);
    }
    const { error } = await admin.from('wedding_items').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
