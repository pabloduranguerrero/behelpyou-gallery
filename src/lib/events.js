// Helpers para gestionar eventos (slug + PIN).
//
// Por simplicidad (y porque el PIN no es un secreto fuerte: va impreso en
// el papel del QR), los PINs estan hardcodeados aqui con un fallback.
// Si quieres sobreescribirlos sin tocar codigo, usa la variable de entorno
// NEXT_PUBLIC_EVENT_PINS=teresa-pablo:TP2026,maria-juan:MJ0925
//
// El slug es el identificador interno; el PIN es lo que tecleara el invitado.

// === FALLBACK: edita aqui para anadir/cambiar bodas y PINs sin redesplegar variables ===
const DEFAULT_PINS = 'teresa-pablo:TP2026';

export const EVENT_META = {
  'teresa-pablo': {
    couple: 'Teresa & Pablo',
    date: '22 de Agosto de 2026',
    location: '',
    hashtag: '#TeresaYPablo2026'
  }
};

function parsePins(raw) {
  const map = {};
  if (!raw) return map;
  raw.split(',').forEach((pair) => {
    const [slug, pin] = pair.split(':').map((s) => (s || '').trim());
    if (slug && pin) map[slug] = pin.toUpperCase();
  });
  return map;
}

// SOLO en el servidor (lee EVENT_PINS, sin el prefijo NEXT_PUBLIC_)
export function getServerPins() {
  return parsePins(
    process.env.EVENT_PINS || process.env.NEXT_PUBLIC_EVENT_PINS || DEFAULT_PINS
  );
}

// En el cliente: si la variable de entorno no esta definida, usa el fallback
// hardcodeado para que la app siempre funcione.
export function getClientPins() {
  return parsePins(process.env.NEXT_PUBLIC_EVENT_PINS || DEFAULT_PINS);
}

export function findEventByPin(pin) {
  if (!pin) return null;
  const pins = getClientPins();
  const normalized = pin.toUpperCase().trim();
  for (const [slug, expected] of Object.entries(pins)) {
    if (expected === normalized) return slug;
  }
  return null;
}

export function checkPin(slug, pin) {
  if (!slug || !pin) return false;
  const pins = getClientPins();
  return pins[slug] && pins[slug] === pin.toUpperCase().trim();
}

export function getEventMeta(slug) {
  return EVENT_META[slug] || { couple: slug, date: '', location: '', hashtag: '' };
}
