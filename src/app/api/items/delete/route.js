import { NextResponse } from 'next/server';
import { getAdminClient, STORAGE_BUCKET } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Borra una foto / vídeo / mensaje SOLO si el uploader_id coincide.
// Sin uploader_id válido, falla.
export async function POST(req) {
  try {
    const body = await req.json();
    const { id, uploader_id } = body || {};
    if (!id || !uploader_id) {
      return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: item, error: fetchErr } = await admin
      .from('wedding_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (item.uploader_id !== uploader_id) {
      return NextResponse.json({ error: 'Sólo puedes eliminar lo que has subido tú.' }, { status: 403 });
    }

    if (item.storage_path) {
      const { error: rmErr } = await admin.storage.from(STORAGE_BUCKET).remove([item.storage_path]);
      if (rmErr) console.warn('storage remove error', rmErr.message);
    }

    const { error: delErr } = await admin.from('wedding_items').delete().eq('id', id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('items/delete', e);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
