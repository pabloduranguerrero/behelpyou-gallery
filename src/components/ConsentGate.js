'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Ornament from '@/components/Ornament';

const STORAGE_PREFIX = 'bhy_consent_';

export default function ConsentGate({ slug, couple = '', children }) {
  const [accepted, setAccepted] = useState(null); // null = comprobando

  useEffect(() => {
    try {
      const ok = localStorage.getItem(`${STORAGE_PREFIX}${slug}`) === '1';
      setAccepted(ok);
    } catch {
      setAccepted(false);
    }
  }, [slug]);

  const accept = () => {
    try { localStorage.setItem(`${STORAGE_PREFIX}${slug}`, '1'); } catch {}
    setAccepted(true);
  };

  if (accepted === null) {
    // Comprobando localStorage; no parpadear contenido.
    return null;
  }

  if (accepted) return children;

  return (
    <main className="container-narrow">
      <section className="hero" style={{ paddingTop: 30, paddingBottom: 14 }}>
        <Ornament className="ornament" size={56} />
        <p className="eyebrow eyebrow-gold">Información importante</p>
        <h1 className="display" style={{ marginTop: 10, fontSize: 34 }}>
          Antes de empezar
        </h1>
        {couple && (
          <p className="muted" style={{ marginTop: 6, letterSpacing: '.12em', textTransform: 'uppercase', fontSize: 12 }}>
            Galería de {couple}
          </p>
        )}
      </section>

      <article className="card" style={{ fontSize: 15, lineHeight: 1.65 }}>
        <p style={{ marginTop: 0 }}>
          Bienvenido/a a la galería privada del evento. Antes de subir o
          visualizar contenido, queremos contarte cómo tratamos tus datos.
        </p>

        <h3 className="display" style={{ fontSize: 20, marginTop: 22, marginBottom: 6 }}>
          Qué se publica aquí
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          Las fotos, vídeos y dedicatorias que subas serán visibles para
          todas las personas que dispongan del PIN del evento. No se
          publican fuera de esta galería privada.
        </p>

        <h3 className="display" style={{ fontSize: 20, marginTop: 22, marginBottom: 6 }}>
          Dónde se guardan tus datos
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          Los archivos se almacenan de forma segura en servidores de
          Supabase (proveedor europeo). El nombre que indiques se mostrará
          junto a tus subidas. No recogemos tu correo, teléfono ni datos
          de contacto.
        </p>

        <h3 className="display" style={{ fontSize: 20, marginTop: 22, marginBottom: 6 }}>
          Tus derechos
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          Podrás eliminar las fotos, vídeos y dedicatorias que tú mismo/a
          hayas subido desde este dispositivo en cualquier momento (botón
          de papelera junto a tus subidas). Si quieres que se elimine
          algún contenido en el que apareces, escribe a{' '}
          <a href="mailto:hola@behelpyou.com" style={{ color: 'var(--gold)' }}>
            hola@behelpyou.com
          </a>{' '}
          y lo retiraremos.
        </p>

        <h3 className="display" style={{ fontSize: 20, marginTop: 22, marginBottom: 6 }}>
          Uso de tus imágenes
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          El contenido subido podrá ser conservado por los novios como
          recuerdo personal del evento y no será cedido a terceros con
          fines comerciales.
        </p>

        <p className="muted" style={{ marginTop: 22, fontSize: 13 }}>
          Al pulsar <strong style={{ color: 'var(--ink)' }}>Acepto y entrar</strong>,
          confirmas haber leído esta información y aceptas las condiciones
          de uso de la galería. Si no estás de acuerdo, no podrás
          continuar.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-ghost">No acepto</Link>
          <button className="btn btn-gold" onClick={accept}>Acepto y entrar</button>
        </div>
      </article>

      <p className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>
        Una experiencia privada de · BeHelpYou
      </p>
    </main>
  );
}
