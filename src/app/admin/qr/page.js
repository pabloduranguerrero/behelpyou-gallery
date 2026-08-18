'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import BrandHeader from '@/components/BrandHeader';
import Footer from '@/components/Footer';
import Ornament from '@/components/Ornament';
import { getClientPins, getEventMeta } from '@/lib/events';

export default function QrPage() {
  const pins = useMemo(() => getClientPins(), []);
  const slugs = Object.keys(pins);
  const [slug, setSlug] = useState(slugs[0] || 'teresa-pablo');
  const meta = useMemo(() => getEventMeta(slug), [slug]);
  const pin = pins[slug] || '';
  const [siteUrl, setSiteUrl] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (fromEnv) setSiteUrl(fromEnv);
    else if (typeof window !== 'undefined') setSiteUrl(window.location.origin);
  }, []);

  // Si la boda tiene publicUrl personalizada (ej. behelpyou.com/galeria-teresaypablo),
  // la usamos. Si no, fallback al subpath /behelpyou-gallery/evento/{slug}.
  const eventUrl = meta.publicUrl
    ? meta.publicUrl
    : `${siteUrl.replace(/\/$/, '')}/behelpyou-gallery/evento/${slug}`;

  const downloadPng = async () => {
    const node = cardRef.current;
    if (!node) return;
    // Render del cartel a PNG usando html2canvas vía SVG-to-canvas manual (sin libs).
    // Truco: serializamos el SVG del QR a alta resolución y dibujamos el cartel a mano sobre canvas.
    const W = 1240, H = 1748; // tamaño A5 a 300dpi aprox
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    // Fondo crema
    ctx.fillStyle = '#faf8f4';
    ctx.fillRect(0, 0, W, H);
    // Borde dorado
    ctx.strokeStyle = '#b08a4a';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, W - 120, H - 120);
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 80, W - 160, H - 160);

    // Tipografías Cargamos sólo si hay disponibles, fallback Times.
    const titleFont = '600 70px "Cormorant Garamond", "Times New Roman", serif';
    const italicFont = 'italic 600 76px "Cormorant Garamond", "Times New Roman", serif';
    const eyebrowFont = '600 22px "Inter", system-ui, sans-serif';
    const bodyFont = '400 26px "Cormorant Garamond", serif';
    const pinFont = '600 90px "Inter", system-ui, sans-serif';

    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';

    ctx.font = eyebrowFont;
    ctx.fillStyle = '#b08a4a';
    ctx.fillText('B E H E L P Y O U  ·  G A L L E R Y', W / 2, 200);

    ctx.font = titleFont;
    ctx.fillStyle = '#1a1a1a';
    const couple = meta.couple;
    ctx.fillText(couple, W / 2, 300);

    if (meta.date) {
      ctx.font = bodyFont;
      ctx.fillStyle = '#6f6a63';
      ctx.fillText(meta.date.toUpperCase(), W / 2, 360);
    }

    // QR
    const QR_SIZE = 720;
    ctx.fillStyle = '#fff';
    ctx.fillRect(W / 2 - QR_SIZE / 2 - 24, 440 - 24, QR_SIZE + 48, QR_SIZE + 48);

    const svg = node.querySelector('svg');
    if (svg) {
      try {
        // Clonamos y forzamos dimensiones explicitas + xmlns para maxima compatibilidad
        const svgClone = svg.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('width', String(QR_SIZE));
        svgClone.setAttribute('height', String(QR_SIZE));

        const xml = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.decoding = 'sync';
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('QR image load failed'));
          img.src = svgUrl;
        });
        // decode() ayuda en Safari a garantizar que la imagen esta lista
        if (img.decode) { try { await img.decode(); } catch {} }

        ctx.drawImage(img, W / 2 - QR_SIZE / 2, 440, QR_SIZE, QR_SIZE);
        URL.revokeObjectURL(svgUrl);
      } catch (err) {
        console.error('Error dibujando QR en canvas', err);
        // Fallback: escribimos la URL en grande para que al menos sirva
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '600 24px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Escanea desde:', W / 2, 780);
        ctx.font = '500 22px monospace';
        ctx.fillText(eventUrl, W / 2, 820);
      }
    }

    // Texto invitación
    ctx.fillStyle = '#1a1a1a';
    ctx.font = italicFont;
    ctx.fillText('Comparte tus recuerdos', W / 2, 1320);

    ctx.font = '500 24px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#6f6a63';
    ctx.fillText('Escanea el código con la cámara de tu móvil', W / 2, 1390);

    ctx.font = '500 20px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#6f6a63';
    ctx.fillText(eventUrl.replace(/^https?:\/\//, ''), W / 2, 1490);

    ctx.font = '600 16px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#b08a4a';
    ctx.fillText('B E H E L P Y O U .  C O M', W / 2, 1600);

    const url = c.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `qr-${slug}.png`;
    a.click();
  };

  const printPage = () => window.print();

  // Descarga solo el QR (sin cartel). Alternativa segura en cualquier navegador.
  const downloadQrOnly = async () => {
    const node = cardRef.current;
    const svg = node?.querySelector('svg');
    if (!svg) return;
    try {
      const SIZE = 1200;
      const svgClone = svg.cloneNode(true);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('width', String(SIZE));
      svgClone.setAttribute('height', String(SIZE));

      const xml = new XMLSerializer().serializeToString(svgClone);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('QR image load failed'));
        img.src = svgUrl;
      });
      if (img.decode) { try { await img.decode(); } catch {} }

      const c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(svgUrl);

      const url = c.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = `qr-solo-${slug}.png`;
      a.click();
    } catch (e) {
      alert('No se pudo generar el QR: ' + (e?.message || e));
    }
  };

  return (
    <>
      <BrandHeader rightSlot={<Link href="/admin" className="btn btn-ghost btn-sm">← Volver al panel</Link>} />
      <main className="container">
        <section className="hero" style={{ paddingTop: 24, paddingBottom: 12 }}>
          <p className="eyebrow eyebrow-gold">Cartel para imprimir</p>
          <h1 className="display" style={{ marginTop: 8 }}>Código QR</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Imprímelo y colócalo en mesas, photocall, o en la propia invitación.
          </p>
        </section>

        <div className="card" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="muted" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Boda</div>
            <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {slugs.map((s) => <option key={s} value={s}>{getEventMeta(s).couple}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="muted" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>URL del QR</div>
            <input className="input" value={eventUrl} readOnly />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={printPage}>Imprimir</button>
            <button className="btn btn-outline btn-sm" onClick={downloadQrOnly}>Solo QR</button>
            <button className="btn btn-gold btn-sm" onClick={downloadPng}>Descargar cartel</button>
          </div>
        </div>

        {/* Cartel */}
        <div className="poster-wrap">
          <div className="poster" ref={cardRef}>
            <div className="poster-inner">
              <p className="eyebrow eyebrow-gold" style={{ letterSpacing: '0.4em' }}>BeHelpYou&nbsp;·&nbsp;Gallery</p>
              <h2 className="display" style={{ fontSize: 44, marginTop: 14 }}>{meta.couple}</h2>
              {meta.date && <p className="muted" style={{ marginTop: 4, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 12 }}>{meta.date}</p>}

              <div style={{ display: 'block', textAlign: 'center', margin: '14px auto' }}>
                <Ornament className="ornament" size={70} />
              </div>

              <div style={{ display: 'block', textAlign: 'center', margin: '10px auto 0' }}>
                <div className="qr-frame" style={{ display: 'inline-block' }}>
                  <QRCodeSVG value={eventUrl} size={320} bgColor="#ffffff" fgColor="#1a1a1a" level="H" includeMargin={false} />
                </div>
              </div>

              <p className="display" style={{ fontSize: 28, fontStyle: 'italic', marginTop: 22 }}>Comparte tus recuerdos</p>
              <p className="muted" style={{ marginTop: 6 }}>Escanea el código con la cámara de tu móvil</p>
              <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>{eventUrl.replace(/^https?:\/\//, '')}</p>

              <div className="poster-foot">B E H E L P Y O U . C O M</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx>{`
        .poster-wrap {
          display: flex; justify-content: center;
          padding: 12px 0 40px;
        }
        .poster {
          background: #faf8f4;
          width: 520px; max-width: 100%;
          border: 4px double #b08a4a;
          padding: 18px;
          box-shadow: 0 30px 80px rgba(26, 26, 26, 0.12);
        }
        .poster-inner {
          border: 1px solid #e9d8b3;
          padding: 32px 24px 28px;
          text-align: center;
        }
        /* Ornamentacion decorativa en su propia linea, centrada */
        .poster-inner :global(svg.ornament) {
          display: block;
          margin: 14px auto;
          color: #b08a4a;
        }
        .qr-frame {
          background: #fff;
          padding: 18px;
          display: inline-block;
          border-radius: 6px;
          margin: 10px auto 0;
        }
        .pin-pill {
          display: inline-block;
          margin-top: 12px;
          padding: 12px 28px;
          font-family: var(--font-body), sans-serif;
          font-weight: 600;
          font-size: 32px;
          letter-spacing: 0.5em;
          color: #1a1a1a;
          background: #fff;
          border: 1px solid #e9d8b3;
          border-radius: 999px;
        }
        .poster-foot {
          margin-top: 26px;
          color: #b08a4a;
          font-size: 11px;
          letter-spacing: 0.4em;
          font-weight: 600;
        }
        @media print {
          :global(body) { background: #fff; }
          :global(.topbar), :global(.footer) { display: none !important; }
          .poster { box-shadow: none; }
        }
      `}</style>
    </>
  );
}
