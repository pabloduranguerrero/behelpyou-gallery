# Cómo desplegar BeHelpYou Gallery en behelpyou.com/behelpyou-gallery

Guía paso a paso para enlazar la app con tu dominio de WordPress.

---

## ✅ Antes de empezar, ten a mano

- Acceso a tu WordPress (panel de administración).
- Acceso al panel de tu hosting (cPanel, Plesk, etc.) por si hay que tocar `.htaccess`.
- Una cuenta de email para crear cuentas en Supabase, GitHub y Vercel (puedes usar la misma).
- Tarjeta no necesaria — todo es **gratis** en su plan inicial.

---

## Fase 1 · Supabase (la base de datos) — 5 min

1. Entra en https://supabase.com → **Sign up** (con GitHub o email).
2. **New project**:
   - Name: `behelpyou-gallery`
   - Database password: pon una larga (la guardas y olvidas)
   - Region: la más cercana (Europe West para España)
3. Cuando esté listo, ve a **Project Settings → API** y copia:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → será tu `SUPABASE_SERVICE_ROLE_KEY` (¡secreta!)
4. Ve a **SQL Editor → New query** y pega esto, luego pulsa **Run**:

```sql
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

alter publication supabase_realtime add table wedding_items;

alter table wedding_items enable row level security;

create policy "Lectura pública del evento"
  on wedding_items for select using (true);

create policy "Inserción anónima"
  on wedding_items for insert with check (true);
```

5. Ve a **Storage → New bucket**:
   - Name: `wedding`
   - **Public bucket: ON** ← importante
6. En **Storage → Policies → wedding** añade:

```sql
create policy "Anon upload wedding"
  on storage.objects for insert to anon
  with check (bucket_id = 'wedding');

create policy "Anon read wedding"
  on storage.objects for select to anon
  using (bucket_id = 'wedding');
```

✅ Supabase listo.

---

## Fase 2 · Subir el código a GitHub — 5 min

1. Crea cuenta en https://github.com.
2. **New repository** → nombre `behelpyou-gallery`, **Privado**, sin README.
3. Abre una terminal en `C:\Users\pablo\behelpyou-gallery\` (Windows: clic derecho en la carpeta con Shift → "Abrir terminal aquí"):

```bash
git init
git add .
git commit -m "BeHelpYou Gallery v1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/behelpyou-gallery.git
git push -u origin main
```

> Si no tienes git instalado: descarga https://git-scm.com/download/win, instálalo y vuelve a probar.

---

## Fase 3 · Desplegar en Vercel — 5 min

1. Entra en https://vercel.com → **Sign up** con GitHub.
2. **Add New → Project** → selecciona el repo `behelpyou-gallery`.
3. En el paso de configuración, **Environment Variables**, añade una a una:

| Nombre | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | (de Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (de Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | (de Supabase) |
| `EVENT_PINS` | `teresa-pablo:TP2026` |
| `NEXT_PUBLIC_EVENT_PINS` | `teresa-pablo:TP2026` |
| `NEXT_PUBLIC_STORAGE_BUCKET` | `wedding` |
| `ADMIN_KEY` | (inventa una clave larga) |
| `NEXT_PUBLIC_SITE_URL` | `https://behelpyou.com` |

4. **Deploy**. En 1-2 min tendrás una URL del tipo `https://behelpyou-gallery-xxx.vercel.app/behelpyou-gallery`.
5. Verifica que carga: visítala y prueba el PIN `TP2026`.

> Apunta esa URL larga de Vercel — la necesitarás en la Fase 4.

---

## Fase 4 · Enlazar a behelpyou.com/behelpyou-gallery

Tres opciones según tu hosting. **Empieza por la A** (la más simple) y, si quieres una URL más limpia luego, migra a la B o C.

### Opción A · Iframe en WordPress (5 min, funciona seguro)

1. En tu WordPress: **Páginas → Añadir nueva**.
2. Título: "Galería de Bodas".
3. **Slug** (URL): `behelpyou-gallery`.
4. Añade bloque **HTML personalizado**:

```html
<style>
  .bhy-iframe-wrap { margin: 0; padding: 0; }
  .bhy-iframe-wrap iframe { width: 100%; height: 92vh; border: 0; display: block; }
</style>
<div class="bhy-iframe-wrap">
  <iframe
    src="https://behelpyou-gallery-xxx.vercel.app/behelpyou-gallery"
    allow="camera *; microphone *; clipboard-read; clipboard-write"
    referrerpolicy="origin">
  </iframe>
</div>
```

5. **Publicar**.
6. Tu plantilla puede tener cabecera y pie de WordPress alrededor — si quieres pantalla completa, usa una plantilla "Página completa / Sin sidebar" si tu tema lo ofrece.

> El QR puede apuntar a la URL larga de Vercel directamente (`https://behelpyou-gallery-xxx.vercel.app/behelpyou-gallery/evento/teresa-pablo`) o a la página de WordPress (`https://behelpyou.com/behelpyou-gallery`). Lo segundo es más bonito visualmente.

### Opción B · Reverse proxy con .htaccess (Apache)

Edita `.htaccess` en la raíz de tu WordPress y añade **arriba del todo, antes** de `# BEGIN WordPress`:

```apache
RewriteEngine On
RewriteRule ^behelpyou-gallery$ /behelpyou-gallery/ [R=301,L]
RewriteRule ^behelpyou-gallery/(.*)$ https://behelpyou-gallery-xxx.vercel.app/behelpyou-gallery/$1 [P,L]
```

Requisitos:
- Apache (la mayoría de hostings WordPress).
- Módulos `mod_rewrite` (siempre) y `mod_proxy` + `mod_proxy_http` (a veces hay que activarlos en cPanel o pedir al soporte).

Una vez activos, `behelpyou.com/behelpyou-gallery/evento/teresa-pablo` cargará Vercel manteniendo la URL bonita.

### Opción C · Cloudflare Worker (el camino "pro")

Pre-requisito: tu dominio gestionado vía Cloudflare (DNS apuntando a sus servidores; lo cambias en tu registrador, gratis).

1. **Cloudflare → Workers & Pages → Create application → Worker**.
2. Pega este código y haz **Deploy**:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/behelpyou-gallery')) {
      const target =
        'https://behelpyou-gallery-xxx.vercel.app' + url.pathname + url.search;
      return fetch(target, request);
    }
    return fetch(request);
  }
};
```

3. En el Worker, **Triggers → Add Custom Domain** o **HTTP route**:
   - Pattern: `behelpyou.com/behelpyou-gallery*`
4. Espera 30 segundos y prueba `https://behelpyou.com/behelpyou-gallery`.

---

## Fase 5 · Generar y imprimir el QR

1. Visita `https://behelpyou.com/behelpyou-gallery/admin` (o tu URL de Vercel mientras configuras).
2. Mete tu `ADMIN_KEY`.
3. **Generar QR**.
4. Selecciona "Teresa & Pablo" y descarga el **PNG**.
5. Imprímelo en el tamaño que quieras (es alta resolución, va bien hasta tamaño A4).

---

## Resolver problemas comunes

**"El PIN da error".**
Comprueba que `EVENT_PINS` y `NEXT_PUBLIC_EVENT_PINS` están **ambas** definidas en Vercel y que las has redeployado tras añadirlas.

**"No se pueden subir fotos".**
Verifica el bucket `wedding` (público) y las dos policies de Storage anteriores.

**"El admin dice 'No autorizado'".**
La cabecera `x-admin-key` debe coincidir con `ADMIN_KEY` en Vercel. Borra cookies y vuelve a entrar.

**"Las fotos no aparecen en tiempo real".**
Es la línea `alter publication supabase_realtime add table wedding_items;`. Vuelve a ejecutarla en SQL Editor.

**"Cambié el código en GitHub y Vercel no actualiza".**
Vercel se re-despliega automáticamente con cada push a la rama `main`. Si no, ve a Vercel → tu proyecto → Deployments → Redeploy.

---

¿Atascado? Cuéntame en el chat dónde te has quedado y te ayudo paso a paso.
