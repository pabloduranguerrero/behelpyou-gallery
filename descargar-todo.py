"""
Descarga TODAS las fotos, videos, miniaturas y dedicatorias de la boda
desde Supabase Storage y las guarda organizadas en una carpeta local.

REQUISITOS:
  - Python 3.8+ instalado
  - Instalar librerias:
        pip install requests

PASOS:
  1. Rellena SUPABASE_URL y SERVICE_ROLE_KEY abajo (los sacas de:
     Supabase Dashboard -> Project Settings -> API).
  2. Ejecuta desde la terminal:
        python descargar-todo.py
  3. Se creara una carpeta 'descargas-boda-YYYY-MM-DD' con todo dentro.
"""

import os
import json
import datetime
import urllib.request
import urllib.error
from pathlib import Path

# =============================================================
# RELLENA ESTAS DOS VARIABLES
# =============================================================
SUPABASE_URL = "https://TU-PROYECTO.supabase.co"   # Sin barra final
SERVICE_ROLE_KEY = "eyJhbGciOi...tu-service_role-key-completa"
BUCKET = "wedding"
EVENT_SLUG = "marina-alvaro"
# =============================================================


def api(url, method="GET", body=None, extra_headers=None):
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        print(f"    [ERROR HTTP {e.code}] {url}")
        try:
            print(f"    Detalle: {e.read().decode()}")
        except Exception:
            pass
        return None


def list_folder(prefix):
    """Lista los archivos en una 'carpeta' del bucket."""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    body = {"prefix": prefix, "limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}}
    raw = api(url, "POST", body)
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def download_file(remote_path, local_path):
    """Descarga un archivo del bucket."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{remote_path}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as f:
                while True:
                    chunk = r.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
        return True
    except urllib.error.HTTPError as e:
        print(f"    [{e.code}] no se pudo descargar {remote_path}")
        return False


def get_messages():
    """Descarga todas las dedicatorias de la tabla wedding_items."""
    url = f"{SUPABASE_URL}/rest/v1/wedding_items?event_slug=eq.{EVENT_SLUG}&type=eq.message&select=guest_name,message,created_at&order=created_at.asc"
    raw = api(url, "GET", extra_headers={"Accept": "application/json"})
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def main():
    if "TU-PROYECTO" in SUPABASE_URL or "tu-service_role-key" in SERVICE_ROLE_KEY:
        print("!!! Rellena SUPABASE_URL y SERVICE_ROLE_KEY arriba antes de ejecutar.")
        return

    today = datetime.date.today().isoformat()
    out = Path(f"descargas-boda-{today}")
    out.mkdir(exist_ok=True)
    print(f"Guardando en: {out.resolve()}\n")

    total = 0
    for sub in ("photos", "videos", "thumbs"):
        prefix = f"{EVENT_SLUG}/{sub}"
        items = list_folder(prefix)
        print(f"[{sub}] {len(items)} archivos")
        for it in items:
            name = it.get("name")
            if not name:
                continue
            remote = f"{prefix}/{name}"
            local = out / sub / name
            if local.exists():
                print(f"    (ya existe) {name}")
                continue
            print(f"    Descargando {name} ...")
            if download_file(remote, local):
                total += 1
        print()

    # Dedicatorias
    print("[dedicatorias] Descargando texto ...")
    msgs = get_messages()
    if msgs:
        lines = []
        for m in msgs:
            when = m.get("created_at", "")[:19].replace("T", " ")
            who = m.get("guest_name", "Invitado")
            txt = m.get("message", "")
            lines.append(f"--- {who}  ({when}) ---\n{txt}\n")
        (out / "dedicatorias.txt").write_text("\n".join(lines), encoding="utf-8")
        print(f"    {len(msgs)} dedicatorias guardadas en dedicatorias.txt")
    else:
        print("    Sin dedicatorias (o no accesibles).")

    print(f"\nHecho. {total} archivos multimedia descargados en '{out}'.")


if __name__ == "__main__":
    main()
