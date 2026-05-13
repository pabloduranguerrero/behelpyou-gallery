# BeHelpYou Gallery

Galería privada para que los invitados de tu boda compartan fotos, vídeos cortos
y dedicatorias escaneando un código QR. Sin registros, sin descargas. Diseño
elegante alineado con la marca **BeHelpYou**.

> Pensada para servirse bajo `https://behelpyou.com/behelpyou-gallery`.

---

## ✨ Funcionalidades

- 🔐 Acceso por **PIN** que se imprime junto al código QR.
- 🖼️ **Galería** con lightbox, vídeos y fotos en tiempo real (Supabase Realtime).
- 📤 **Subida múltiple** con drag & drop, vista previa y barra de progreso.
- 💌 **Dedicatorias** (libro de firmas digital).
- 🪪 **Identidad anónima** por dispositivo: cada invitado puede borrar SUS propias subidas sin registrarse.
- 🛡️ **Panel admin** con clave maestra: moderar, ocultar, borrar, descargar todo en ZIP.
- 🧾 **Generador de cartel** imprimible con QR + PIN listo para mesas / photocall.

---

## 1) Instalar y arrancar

```bash
npm install
cp .env.example .env.local      # rellena las variables
npm run dev                     # http://localhost:3000/behelpyou-gallery
```

> La app está montada bajo `basePath: /behelpyou-gallery`. En local accede a
> `http://localhost:3000/behelpyou-gallery`, no a la raíz.

---

## 2) Configurar Supabase

### 2.1 Crear proyecto

1. Crea un proyecto en https://supabase.com.
2. Copia `Project URL` (NEXT_PUBLIC_SUPABASE_URL), `anon key`
   (NEXT_PUBLIC_SUPABASE_ANON_KEY) y `service_role key`
   (SUPABASE_SERVICE_ROLE_KEY — sólo servidor).

### 2.2 Esquema SQL

Ejecuta en SQL Editor:

```sql
-- Tabla unificada (fotos, vídeos y mensajes en una sola tabla)
create table if not exists wedding_items (
  id bigint generated always as identity primary key,
  event_slug    text not null,
  type          text not null check (type in ('photo','video','message')),
  guest_name    text,
  uploader_id   text not null,
  file_url      text,
  storage_path  text,
  mime_type     text,
  message       text,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists wedding_items_event_idx
  on wedding_items (event_slug, created_at desc);

-- Realtime
alter publication supabase_realtime add table wedding_items;

-- Row Level Security: permitimos lectura e inserción anónimas.
-- El borrado se hace siempre desde rutas /api/* con SERVICE_ROLE,
-- por lo que el cliente anónimo NO puede borrar.
alter table wedding_items enable row level security;

create policy "Lectura pública del evento"
  on wedding_items for select
  using (true);

create policy "Inserción anónima"
  on wedding_items for insert
  with check (true);
```

### 2.3 Storage

1. Crea un **bucket** llamado `wedding` (puedes cambiar el nombre con
   `NEXT_PUBLIC_STORAGE_BUCKET`).
2. Marca el bucket como **público** (Public bucket).
3. (Opcional) Añade una política para limitar el tamaño / tipo:

```sql
-- Permitir uploads anónimos en el bucket wedding
create policy "Anon upload wedding"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'wedding');

create policy "Anon read wedding"
  on storage.objects for select
  to anon
  using (bucket_id = 'wedding');
```

---

## 3) Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # SOLO servidor

# Lista slug:PIN separada por coma. Cambia el PIN cada año.
EVENT_PINS=teresa-pablo:TP2026
NEXT_PUBLIC_EVENT_PINS=teresa-pablo:TP2026

NEXT_PUBLIC_STORAGE_BUCKET=wedding
ADMIN_KEY=usa_una_clave_LARGA_y_aleatoria
NEXT_PUBLIC_SITE_URL=https://behelpyou.com
```

> El PIN no es un secreto fuerte: va impreso en el papel del QR. Su función
> es evitar accesos casuales y separar bodas distintas.

### Cómo añadir nuevas bodas

1. Añade el slug y el PIN en `EVENT_PINS` y `NEXT_PUBLIC_EVENT_PINS`.
2. (Opcional) añade nombres y fecha en `EVENT_META` dentro de
   `src/lib/events.js`.
3. Vuelve a desplegar y entra en `/admin/qr` para descargar el cartel.

---

## 4) Despliegue (Vercel + dominio behelpyou.com)

### 4.1 Subir a Vercel

1. Sube el repo a GitHub y conéctalo en https://vercel.com.
2. Añade todas las variables anteriores en *Project Settings → Environment Variables*.
3. Deploy.

### 4.2 Servir en `behelpyou.com/behelpyou-gallery`

La app ya tiene `basePath: '/behelpyou-gallery'` en `next.config.js`, así que
la URL pública es `https://<vercel-app>/behelpyou-gallery`.

Para que se sirva bajo tu dominio principal (que probablemente apunta a otra
web), tienes dos opciones:

**Opción A — Subdominio (más simple).** Apunta `gallery.behelpyou.com`
directamente al deploy de Vercel y cambia `basePath` a `''`. Tendrás
`https://gallery.behelpyou.com`.

**Opción B — Subruta (`/behelpyou-gallery` dentro de tu web).** Configura un
*reverse proxy / rewrite* en tu hosting principal o en Cloudflare:

```
behelpyou.com/behelpyou-gallery/*  →  https://<vercel-app>.vercel.app/behelpyou-gallery/*
```

Ejemplo de regla **Cloudflare Workers / Page Rules**:

```js
// Worker: forward /behelpyou-gallery/* to the Vercel app
addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/behelpyou-gallery')) {
    const target = 'https://<vercel-app>.vercel.app' + url.pathname + url.search;
    event.respondWith(fetch(target, event.request));
  }
});
```

Si usas **Nginx** delante:

```nginx
location /behelpyou-gallery/ {
  proxy_pass https://<vercel-app>.vercel.app;
  proxy_set_header Host <vercel-app>.vercel.app;
}
```

> Mantener el `basePath` permite usar la opción B sin reescribir todas las
> URLs internas de Next.

---

## 5) Cartel QR + PIN

1. Entra en `https://behelpyou.com/behelpyou-gallery/admin` con tu `ADMIN_KEY`.
2. Pulsa **Generar QR**.
3. Selecciona la boda y descarga PNG o imprime directamente.

El cartel incluye:

- Logotipo y marca BeHelpYou.
- Nombre de los novios y fecha.
- QR a `…/evento/<slug>`.
- PIN bien visible para teclear si el QR falla.

---

## 6) Estructura

```
src/
  app/
    page.js                       # Home con campo PIN único
    layout.js                     # Fonts (Cormorant + Inter), metadata
    globals.css                   # Sistema de diseño
    evento/[slug]/page.js         # Galería + Subir + Dedicatorias
    admin/page.js                 # Panel privado
    admin/qr/page.js              # Generador de cartel QR
    api/
      items/delete/route.js       # Borrado de un invitado (valida uploader_id)
      admin/list/route.js         # Listar todo (admin)
      admin/delete/route.js       # Borrado por admin
      admin/hide/route.js         # Ocultar / mostrar
  components/
    BrandHeader.js
    Footer.js
    Ornament.js
  lib/
    supabase.js                   # Cliente anónimo
    supabaseAdmin.js              # Cliente service_role (server)
    events.js                     # Slugs, PINs y metadatos
    uploaderId.js                 # ID anónimo en localStorage
public/
  logo-behelpyou.png
```

---

## 7) Seguridad y privacidad

- El PIN protege contra navegadores casuales, no es cifrado.
- Las URLs de Supabase Storage son públicas si el bucket es público.
  Si necesitas privacidad fuerte, cambia el bucket a privado y sirve URLs
  firmadas desde una API route.
- Las claves `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_KEY` **nunca** deben
  filtrarse al cliente.
- El `uploader_id` se guarda en `localStorage`. Si el invitado limpia datos,
  perderá la capacidad de borrar sus subidas (puedes borrarlas tú desde
  `/admin`).

---

## 8) Personalización rápida

- **Colores y tipografía**: edita `:root` en `src/app/globals.css`.
- **Texto y eslóganes**: en `src/app/page.js` y `src/app/evento/[slug]/page.js`.
- **Datos de boda** (nombre, fecha, hashtag): `EVENT_META` en `src/lib/events.js`.

---

Hecho con ♥ para BeHelpYou.
