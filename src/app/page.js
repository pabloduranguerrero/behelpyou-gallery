'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandHeader from '@/components/BrandHeader';
import Footer from '@/components/Footer';
import Ornament from '@/components/Ornament';
import { findEventByPin } from '@/lib/events';

export default function Home() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = (e) => {
    e?.preventDefault?.();
    setError('');
    const cleaned = pin.trim();
    if (!cleaned) {
      setError('Introduce el PIN que aparece en tu invitación.');
      return;
    }
    setLoading(true);
    const slug = findEventByPin(cleaned);
    if (!slug) {
      setLoading(false);
      setError('PIN no válido. Revísalo en el papel junto al código QR.');
      return;
    }
    try {
      sessionStorage.setItem(`bhy_pin_${slug}`, cleaned.toUpperCase());
    } catch {}
    router.push(`/evento/${slug}`);
  };

  return (
    <>
      <BrandHeader />
      <main className="container-narrow">
        <section className="hero">
          <div className="logo-hero">
            <img src="/logo-behelpyou.png" alt="BeHelpYou" />
          </div>
          <Ornament className="ornament" size={64} />
          <p className="eyebrow eyebrow-gold">BeHelpYou&nbsp;·&nbsp;Gallery</p>
          <h1 className="display" style={{ marginTop: 12 }}>
            Comparte tus <em>recuerdos</em>
          </h1>
          <p className="muted" style={{ marginTop: 10, fontSize: 16, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
            Introduce el PIN que encontrarás en tu invitación o
            junto al código QR para acceder a la galería privada del evento.
          </p>
        </section>

        <form className="card" onSubmit={onSubmit} style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="pin">PIN del evento</label>
            <input
              id="pin"
              className="input input-pin"
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -4, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button className="btn btn-gold" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
            Tu acceso es privado. Sólo verán las fotos quienes tengan el PIN.
          </p>
        </form>

        <p className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Una experiencia de · BeHelpYou
        </p>
      </main>
      <Footer />
    </>
  );
}
