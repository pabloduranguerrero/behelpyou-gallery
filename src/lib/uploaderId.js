// Identificador anónimo del invitado, persistido en localStorage.
// Permite que cada dispositivo borre SUS propias subidas sin necesidad
// de registro ni contraseñas.

const KEY = 'bhy_uploader_id';
const NAME_KEY = 'bhy_guest_name';

function rnd() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getUploaderId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = rnd();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function getGuestName() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(NAME_KEY) || '';
}

export function setGuestName(name) {
  if (typeof window === 'undefined') return;
  if (name) window.localStorage.setItem(NAME_KEY, name);
}
