'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import BrandHeader from '@/components/BrandHeader';
import Footer from '@/components/Footer';
import Ornament from '@/components/Ornament';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { checkPin, getEventMeta } from '@/lib/events';
import { getUploaderId, getGuestName, setGuestName } from '@/lib/uploaderId';

const MAX_FILE_MB = 50;

// Genera una miniatura JPEG a partir del primer frame "interesante" de un video.
// Devuelve un Blob listo para subir o null si no se ha podido.
function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    const cleanup = () => {
      try { URL.revokeObjectURL(video.src); } catch {}
    };

    let captured = false;
    const capture = () => {
      if (captured) return;
      captured = true;
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          cleanup();
          return resolve(null);
        }
        const max = 720;
        const scale = Math.min(1, max / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          'image/jpeg',
          0.85
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    video.onloadedmetadata = () => {
      // Saltamos un poquito hacia delante para evitar frame negro inicial.
      const target = Math.min(0.5, (video.duration || 1) * 0.1);
      try { video.currentTime = target; }
      catch { capture(); }
    };

    video.onseeked = capture;
    video.onerror = () => { cleanup(); resolve(null); };
    // Failsafe por si seeked no dispara en algun movil
    setTimeout(() => { if (!captured) capture(); }, 4000);
  });
}

export default function EventPage({ params }) {
  const slug = params.slug;
  const meta = useMemo(() => getEventMeta(slug), [slug]);

  // PIN desactivado: acceso directo a la galeria.
  // Para reactivarlo, cambia el "true" por "false".
  const [authed, setAuthed] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [tab, setTab] = useState('gallery');
  const [items, setItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploaderId, setUploaderId] = useState('');
  const [name, setName] = useState('');

  const [files, setFiles] = useState([]); // {file, url, type}
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [postingMsg, setPostingMsg] = useState(false);

  const [lightboxIdx, setLightboxIdx] = useState(-1);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  // -------- Acceso por PIN --------
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`bhy_pin_${slug}`);
      if (cached && checkPin(slug, cached)) setAuthed(true);
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (!authed) return;
    setUploaderId(getUploaderId());
    setName(getGuestName());
  }, [authed]);

  // -------- Cargar contenido --------
  const load = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('wedding_items')
      .select('*')
      .eq('event_slug', slug)
      .eq('hidden', false)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('LOAD_ERROR', error);
      const msg = error?.message || JSON.stringify(error);
      showToast(`Error al cargar: ${msg}`, true);
    } else {
      const all = data || [];
      setItems(all.filter((x) => x.type === 'photo' || x.type === 'video'));
      setMessages(all.filter((x) => x.type === 'message'));
    }
    setLoading(false);
  }, [authed, slug]);

  useEffect(() => { load(); }, [load]);

  // -------- Realtime --------
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel(`wedding_items_${slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wedding_items', filter: `event_slug=eq.${slug}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, slug, load]);

  // -------- Toast --------
  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3200);
  };

  // -------- PIN gate --------
  const submitPin = (e) => {
    e?.preventDefault?.();
    setPinError('');
    if (!checkPin(slug, pinInput)) {
      setPinError('PIN incorrecto. Comprueba el papel del QR.');
      return;
    }
    try { sessionStorage.setItem(`bhy_pin_${slug}`, pinInput.toUpperCase()); } catch {}
    setAuthed(true);
  };

  // -------- Subida --------
  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const accepted = arr.filter((f) => {
      if (!/^image\/|^video\//.test(f.type)) {
        showToast(`"${f.name}" no es foto ni vídeo`, true);
        return false;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        showToast(`"${f.name}" supera ${MAX_FILE_MB}MB`, true);
        return false;
      }
      return true;
    });
    const mapped = accepted.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'photo'
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const onDropFiles = (e) => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer?.files);
  };

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setGuestName(name);
    let done = 0;

    for (const item of files) {
      try {
        const ext = (item.file.name.split('.').pop() || 'bin').toLowerCase();
        const folder = item.type === 'video' ? 'videos' : 'photos';
        const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const path = `${slug}/${folder}/${stamp}.${ext}`;

        const up = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, item.file, { cacheControl: '3600', upsert: false, contentType: item.file.type });

        if (up.error) throw up.error;

        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

        // Para videos, generamos una miniatura del primer frame y la subimos aparte.
        let thumbUrl = null;
        if (item.type === 'video') {
          try {
            const thumbBlob = await generateVideoThumbnail(item.file);
            if (thumbBlob) {
              const thumbPath = `${slug}/thumbs/${stamp}.jpg`;
              const upThumb = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(thumbPath, thumbBlob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
              if (!upThumb.error) {
                const { data: thumbPub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbPath);
                thumbUrl = thumbPub.publicUrl;
              }
            }
          } catch (thumbErr) {
            console.warn('THUMB_ERROR', thumbErr);
            // Si falla la miniatura, seguimos sin ella (no es bloqueante).
          }
        }

        const { error: insertErr } = await supabase.from('wedding_items').insert({
          event_slug: slug,
          type: item.type,
          guest_name: (name || '').trim() || 'Invitado anónimo',
          uploader_id: uploaderId,
          file_url: pub.publicUrl,
          thumb_url: thumbUrl,
          storage_path: path,
          mime_type: item.file.type
        });
        if (insertErr) throw insertErr;
      } catch (err) {
        console.error('UPLOAD_ERROR', err);
        const msg = err?.message || err?.error_description || JSON.stringify(err);
        showToast(`Error: ${msg}`, true);
      }
      done += 1;
      setProgress(Math.round((done / files.length) * 100));
    }

    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setUploading(false);
    setProgress(0);
    showToast(`¡Gracias! ${done === 1 ? 'Recuerdo añadido' : `${done} recuerdos añadidos`}.`);
    setTab('gallery');
    load();
  };

  // -------- Borrar propio --------
  const deleteOwn = async (item) => {
    if (!confirm('¿Eliminar este recuerdo?')) return;
    try {
      const res = await fetch('/behelpyou-gallery/api/items/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, uploader_id: uploaderId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      showToast('Eliminado');
      load();
    } catch (e) {
      showToast(e.message || 'No se pudo eliminar', true);
    }
  };

  // -------- Mensajes --------
  const postMessage = async (e) => {
    e?.preventDefault?.();
    const text = messageText.trim();
    if (!text) return;
    setPostingMsg(true);
    setGuestName(name);
    const { error } = await supabase.from('wedding_items').insert({
      event_slug: slug,
      type: 'message',
      guest_name: (name || '').trim() || 'Invitado anónimo',
      uploader_id: uploaderId,
      message: text
    });
    setPostingMsg(false);
    if (error) {
      console.error('MESSAGE_ERROR', error);
      const msg = error?.message || JSON.stringify(error);
      showToast(`Error: ${msg}`, true);
      return;
    }
    setMessageText('');
    showToast('¡Gracias por tu dedicatoria!');
    load();
  };

  // -------- Lightbox --------
  const openAt = (idx) => setLightboxIdx(idx);
  const closeLb = useCallback(() => setLightboxIdx(-1), []);
  const navLb = useCallback((delta) => {
    setLightboxIdx((i) => {
      if (i < 0 || items.length === 0) return i;
      const next = (i + delta + items.length) % items.length;
      return next;
    });
  }, [items.length]);

  useEffect(() => {
    if (lightboxIdx < 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') navLb(1);
      if (e.key === 'ArrowLeft') navLb(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, closeLb, navLb]);

  // ========== RENDER ==========

  if (!authed) {
    return (
      <>
        <BrandHeader />
        <main className="container-narrow">
          <section className="hero">
            <p className="eyebrow eyebrow-gold">Acceso privado</p>
            <h1 className="display" style={{ marginTop: 12 }}>{meta.couple}</h1>
            {meta.date && <p className="muted" style={{ marginTop: 6 }}>{meta.date}</p>}
          </section>
          <form className="card" onSubmit={submitPin}>
            <div className="field">
              <label htmlFor="pin">Introduce el PIN del evento</label>
              <input
                id="pin"
                className="input input-pin"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                maxLength={16}
                autoFocus
                autoComplete="off"
              />
            </div>
            {pinError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{pinError}</p>}
            <button className="btn btn-gold" style={{ width: '100%' }} type="submit">Entrar</button>
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <BrandHeader rightSlot={
        <span className="muted" style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {meta.couple}
        </span>
      } />

      <main className="container">
        <section className="hero">
          <Ornament className="ornament" size={64} />
          <p className="eyebrow eyebrow-gold">Galería privada</p>
          <h1 className="display" style={{ marginTop: 10 }}>
            {meta.couple.split(' & ')[0]} <em>&amp;</em> {meta.couple.split(' & ')[1] || ''}
          </h1>
          {meta.date && <p className="muted" style={{ marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 12 }}>{meta.date}</p>}
          {meta.hashtag && <p className="muted" style={{ marginTop: 4, fontStyle: 'italic' }}>{meta.hashtag}</p>}
        </section>

        <nav className="tabs" role="tablist">
          <button className={`tab ${tab === 'gallery' ? 'active' : ''}`} onClick={() => setTab('gallery')}>
            Galería <span className="count">{items.length}</span>
          </button>
          <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            Subir
          </button>
          <button className={`tab ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}>
            Dedicatorias <span className="count">{messages.length}</span>
          </button>
        </nav>

        {tab === 'gallery' && (
          <section>
            {loading ? (
              <p className="muted" style={{ textAlign: 'center' }}>Cargando recuerdos…</p>
            ) : items.length === 0 ? (
              <div className="empty">
                <Ornament className="ornament" />
                <h3 className="display">Aún no hay fotos</h3>
                <p>Sé el primero en compartir un recuerdo desde la pestaña <strong>Subir</strong>.</p>
                <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={() => setTab('upload')}>Subir recuerdos</button>
              </div>
            ) : (
              <div className="grid">
                {items.map((it, i) => {
                  const own = it.uploader_id === uploaderId;
                  return (
                    <div key={it.id} className="tile" onClick={() => openAt(i)}>
                      {it.type === 'video' ? (
                        it.thumb_url ? (
                          <img src={it.thumb_url} alt={`Vídeo de ${it.guest_name}`} loading="lazy" />
                        ) : (
                          <video src={it.file_url} preload="metadata" muted playsInline />
                        )
                      ) : (
                        <img src={it.file_url} alt={`Recuerdo de ${it.guest_name}`} loading="lazy" />
                      )}
                      {it.type === 'video' && (
                        <>
                          <span className="badge">Vídeo</span>
                          <span className="play-icon" aria-hidden="true">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7L8 5z" />
                            </svg>
                          </span>
                        </>
                      )}
                      <div className="meta">
                        <span className="name">{it.guest_name}</span>
                      </div>
                      {own && (
                        <div className="own-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="icon-btn" title="Eliminar mi subida" onClick={() => deleteOwn(it)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'upload' && (
          <section className="card">
            <h2 className="display" style={{ marginTop: 0 }}>Comparte un recuerdo</h2>
            <p className="muted" style={{ marginTop: -4, marginBottom: 18 }}>
              Sube una o varias fotos / vídeos cortos. Aparecerán al instante en la galería.
            </p>

            <div className="field">
              <label htmlFor="name">Tu nombre (aparecerá junto a tu foto)</label>
              <input
                id="name"
                className="input"
                placeholder="Ej. Lucía"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </div>

            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDropFiles}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
            >
              <div className="icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 16V4m0 0l-5 5m5-5l5 5" />
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
              </div>
              <div className="display" style={{ fontSize: 22 }}>Toca aquí o arrastra archivos</div>
              <div className="hint">Fotos y vídeos hasta {MAX_FILE_MB}MB cada uno</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            {files.length > 0 && (
              <>
                <div className="preview-row">
                  {files.map((f, idx) => (
                    <div key={idx} className="preview-thumb">
                      {f.type === 'video'
                        ? <video src={f.url} muted playsInline />
                        : <img src={f.url} alt="" />}
                      <button onClick={() => removeFile(idx)} title="Quitar">×</button>
                    </div>
                  ))}
                </div>
                {uploading && (
                  <div className="progress" aria-label={`Subiendo ${progress}%`}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" onClick={() => { files.forEach((f) => URL.revokeObjectURL(f.url)); setFiles([]); }} disabled={uploading}>Cancelar</button>
                  <button className="btn btn-gold" onClick={upload} disabled={uploading}>
                    {uploading ? `Subiendo ${progress}%` : `Subir ${files.length} ${files.length === 1 ? 'recuerdo' : 'recuerdos'}`}
                  </button>
                </div>
              </>
            )}

            <p className="muted" style={{ marginTop: 22, fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
              Al subir aceptas que tus fotos y vídeos sean visibles para los invitados con PIN.
              Sólo tú podrás eliminarlos desde este dispositivo. Para retirar contenido en el que apareces,
              escribe a <a href="mailto:hola@behelpyou.com" style={{ color: 'var(--gold)' }}>hola@behelpyou.com</a>.
            </p>
          </section>
        )}

        {tab === 'messages' && (
          <section>
            <div className="card" style={{ marginBottom: 22 }}>
              <h2 className="display" style={{ marginTop: 0 }}>Deja una dedicatoria</h2>
              <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
                Unas palabras para los novios. Quedará para siempre en su libro digital.
              </p>
              <form onSubmit={postMessage}>
                <div className="field">
                  <label htmlFor="msgname">Tu nombre</label>
                  <input
                    id="msgname"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Lucía"
                    maxLength={40}
                  />
                </div>
                <div className="field">
                  <label htmlFor="msg">Tu dedicatoria</label>
                  <textarea
                    id="msg"
                    className="textarea"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Os deseamos lo mejor en este día tan especial…"
                    maxLength={600}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-gold" type="submit" disabled={postingMsg || !messageText.trim()}>
                    {postingMsg ? 'Enviando…' : 'Enviar dedicatoria'}
                  </button>
                </div>
              </form>
              <p className="muted" style={{ marginTop: 14, fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
                Al enviar aceptas que tu dedicatoria sea visible para los invitados con PIN.
              </p>
            </div>

            {messages.length === 0 ? (
              <div className="empty">
                <Ornament className="ornament" />
                <h3 className="display">Aún no hay dedicatorias</h3>
                <p>Sé el primero en dejar unas palabras para los novios.</p>
              </div>
            ) : (
              <div className="messages">
                {messages.map((m) => {
                  const own = m.uploader_id === uploaderId;
                  return (
                    <article key={m.id} className="message-card">
                      <p className="body">{m.message}</p>
                      <div className="sig">
                        <span>— {m.guest_name}</span>
                        {own && <button onClick={() => deleteOwn(m)} title="Eliminar mi dedicatoria">Eliminar</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />

      {lightboxIdx >= 0 && items[lightboxIdx] && (
        <div className="lightbox" onClick={closeLb}>
          <button className="lb-close" onClick={(e) => { e.stopPropagation(); closeLb(); }} aria-label="Cerrar">×</button>
          {items.length > 1 && (
            <>
              <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); navLb(-1); }} aria-label="Anterior">‹</button>
              <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); navLb(1); }} aria-label="Siguiente">›</button>
            </>
          )}
          <div className="stage" onClick={(e) => e.stopPropagation()}>
            {items[lightboxIdx].type === 'video' ? (
              <video src={items[lightboxIdx].file_url} controls autoPlay playsInline />
            ) : (
              <img src={items[lightboxIdx].file_url} alt={`Recuerdo de ${items[lightboxIdx].guest_name}`} />
            )}
            <div className="lb-meta">
              {items[lightboxIdx].guest_name} · {new Date(items[lightboxIdx].created_at).toLocaleString('es-ES')}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.msg}</div>}
    </>
  );
}
