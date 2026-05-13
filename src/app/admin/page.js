'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BrandHeader from '@/components/BrandHeader';
import Footer from '@/components/Footer';

const KEY_STORAGE = 'bhy_admin_key';
const BASE = '/behelpyou-gallery';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // all | photo | video | message | hidden
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(KEY_STORAGE);
      if (cached) { setAdminKey(cached); tryLogin(cached); }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const callApi = async (path, body, key = adminKey) => {
    const res = await fetch(`${BASE}/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(body || {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error');
    return json;
  };

  const tryLogin = async (key) => {
    setLoginError('');
    setLoading(true);
    try {
      const json = await callApi('list', { slug: '' }, key);
      setAuthed(true);
      setItems(json.items || []);
      try { sessionStorage.setItem(KEY_STORAGE, key); } catch {}
    } catch (e) {
      setLoginError('Clave incorrecta o error de conexión.');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const json = await callApi('list', { slug });
      setItems(json.items || []);
    } catch (e) { showToast(e.message, true); }
    setLoading(false);
  };

  useEffect(() => { if (authed) refresh(); /* eslint-disable-next-line */ }, [slug]);

  const stats = useMemo(() => {
    const photos = items.filter((i) => i.type === 'photo').length;
    const videos = items.filter((i) => i.type === 'video').length;
    const messages = items.filter((i) => i.type === 'message').length;
    const hidden = items.filter((i) => i.hidden).length;
    return { photos, videos, messages, hidden, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'hidden') return items.filter((i) => i.hidden);
    if (filter === 'all') return items;
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  const slugs = useMemo(() => {
    const s = new Set(items.map((i) => i.event_slug));
    return Array.from(s);
  }, [items]);

  const toggleHide = async (it) => {
    setBusy(true);
    try {
      await callApi('hide', { id: it.id, hidden: !it.hidden });
      showToast(it.hidden ? 'Visible de nuevo' : 'Oculto del feed');
      refresh();
    } catch (e) { showToast(e.message, true); }
    setBusy(false);
  };

  const remove = async (it) => {
    if (!confirm('Eliminar definitivamente este elemento?')) return;
    setBusy(true);
    try {
      await callApi('delete', { id: it.id });
      showToast('Eliminado');
      refresh();
    } catch (e) { showToast(e.message, true); }
    setBusy(false);
  };

  const downloadAllZip = async () => {
    setZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const media = items.filter((i) => (i.type === 'photo' || i.type === 'video') && i.file_url);
      // Mensajes a un .txt
      const msgs = items.filter((i) => i.type === 'message');
      if (msgs.length) {
        const txt = msgs
          .map((m) => `— ${m.guest_name} (${new Date(m.created_at).toLocaleString('es-ES')})\n${m.message}\n`)
          .join('\n');
        zip.file('dedicatorias.txt', txt);
      }
      let i = 0;
      for (const m of media) {
        try {
          const r = await fetch(m.file_url);
          const blob = await r.blob();
          const ext = (m.mime_type?.split('/')[1] || 'bin').replace('jpeg', 'jpg');
          const safeName = (m.guest_name || 'invitado').replace(/[^a-z0-9_\-]/gi, '_');
          zip.file(`${m.event_slug}/${m.type}/${safeName}_${m.id}.${ext}`, blob);
        } catch (err) { console.warn('skip', m.id, err); }
        i += 1;
        if (i % 5 === 0) showToast(`Empaquetando ${i}/${media.length}…`);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `behelpyou-gallery-${slug || 'todo'}-${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('ZIP listo');
    } catch (e) {
      showToast('Error al empaquetar: ' + e.message, true);
    }
    setZipping(false);
  };

  const logout = () => {
    try { sessionStorage.removeItem(KEY_STORAGE); } catch {}
    setAdminKey(''); setAuthed(false); setItems([]);
  };

  if (!authed) {
    return (
      <>
        <BrandHeader />
        <main className="container-narrow">
          <section className="hero">
            <p className="eyebrow eyebrow-gold">Panel privado</p>
            <h1 className="display" style={{ marginTop: 12 }}>Administración</h1>
            <p className="muted" style={{ marginTop: 8 }}>Acceso restringido al organizador del evento.</p>
          </section>
          <form className="card" onSubmit={(e) => { e.preventDefault(); tryLogin(adminKey); }}>
            <div className="field">
              <label htmlFor="key">Clave maestra</label>
              <input
                id="key"
                className="input"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
            {loginError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{loginError}</p>}
            <button className="btn btn-gold" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Comprobando…' : 'Entrar'}
            </button>
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <BrandHeader rightSlot={
        <>
          <Link href="/admin/qr" className="btn btn-ghost btn-sm">Generar QR</Link>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
        </>
      } />

      <main className="container">
        <section className="hero" style={{ paddingTop: 24, paddingBottom: 16 }}>
          <p className="eyebrow eyebrow-gold">Panel admin</p>
          <h1 className="display" style={{ marginTop: 8 }}>BeHelpYou Gallery</h1>
        </section>

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <Stat label="Fotos" value={stats.photos} />
              <Stat label="Vídeos" value={stats.videos} />
              <Stat label="Dedicatorias" value={stats.messages} />
              <Stat label="Ocultas" value={stats.hidden} />
              <Stat label="Total" value={stats.total} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="input" style={{ minWidth: 180 }} value={slug} onChange={(e) => setSlug(e.target.value)}>
                <option value="">Todas las bodas</option>
                {slugs.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={refresh} disabled={loading}>
                {loading ? 'Actualizando…' : 'Refrescar'}
              </button>
              <button className="btn btn-gold btn-sm" onClick={downloadAllZip} disabled={zipping || items.length === 0}>
                {zipping ? 'Empaquetando…' : 'Descargar ZIP'}
              </button>
            </div>
          </div>
        </div>

        <nav className="tabs">
          {[
            { k: 'all', label: 'Todo' },
            { k: 'photo', label: 'Fotos' },
            { k: 'video', label: 'Vídeos' },
            { k: 'message', label: 'Dedicatorias' },
            { k: 'hidden', label: 'Ocultas' }
          ].map((t) => (
            <button key={t.k} className={`tab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
              {t.label}
            </button>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 40 }}>Sin resultados.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map((it) => (
              <article key={it.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: it.hidden ? 0.55 : 1 }}>
                {it.type === 'message' ? (
                  <div style={{ padding: 18, fontFamily: 'var(--font-display), serif', fontSize: 17, color: 'var(--ink-2)', minHeight: 140 }}>
                    “{it.message}”
                  </div>
                ) : it.type === 'video' ? (
                  <video src={it.file_url} controls style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', background: '#000' }} />
                ) : (
                  <img src={it.file_url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                )}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{it.guest_name}</span>
                    <span className="muted">{it.event_slug}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {new Date(it.created_at).toLocaleString('es-ES')}
                    {it.hidden && <strong style={{ marginLeft: 8, color: 'var(--danger)' }}> · OCULTA</strong>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleHide(it)} disabled={busy}>
                      {it.hidden ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(it)} disabled={busy}>Eliminar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.msg}</div>}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 28, lineHeight: 1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
