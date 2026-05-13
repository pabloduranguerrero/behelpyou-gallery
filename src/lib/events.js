// Helpers para gestionar eventos (slug + PIN) desde variables de entorno.
//
// Formato esperado en .env:
//   NEXT_PUBLIC_EVENT_PINS=teresa-pablo:TP2026,maria-juan:MJ0925
//
// Cada slug representa una boda. El "label" se calcula a partir del slug,
// pero puedes ampliar EVENT_META para personalizarlo.

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
  return parsePins(process.env.EVENT_PINS || process.env.NEXT_PUBLIC_EVENT_PINS);
}

// En el cliente usamos NEXT_PUBLIC_EVENT_PINS para validar localmente
// antes de redirigir. Es aceptable porque el PIN va en el papel del QR
// que ya tiene el invitado: no es un secreto fuerte.
export function getClientPins() {
  return parsePins(process.env.NEXT_PUBLIC_EVENT_PINS);
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
