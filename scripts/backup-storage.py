#!/usr/bin/env python3
"""Copia de objetos de Supabase Storage; no registra ni publica claves."""
import json
import os
from pathlib import Path
import sys
from urllib.parse import quote
from urllib.request import Request, urlopen

BASE = "https://djrmbdbtfsgzwwcsatll.supabase.co/storage/v1"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ROOT = Path(sys.argv[1])
BUCKETS = sys.argv[2:]
# La clave moderna sb_secret_ se autentica con apikey; la legacy JWT también admite Bearer.
HEADERS = {"apikey": KEY, "Content-Type": "application/json"}
if not KEY.startswith("sb_secret_"):
    HEADERS["Authorization"] = "Bearer " + KEY

def request(url, body=None):
    req = Request(url, data=body, headers=HEADERS, method="POST" if body is not None else "GET")
    with urlopen(req, timeout=90) as response:
        return response.read()

total = 0
for bucket in BUCKETS:
    # Evitar rutas que salgan del directorio de respaldo.
    if not bucket or bucket in (".", "..") or any(c in bucket for c in ("/", "\\")):
        raise ValueError("Nombre de bucket no seguro")
    files = 0
    pending = [""]
    while pending:
        prefix = pending.pop()
        offset = 0
        while True:
            body = json.dumps({
                "prefix": prefix, "limit": 100, "offset": offset,
                "sortBy": {"column": "name", "order": "asc"}
            }).encode("utf-8")
            items = json.loads(request(BASE + "/object/list/" + quote(bucket, safe=""), body))
            if not isinstance(items, list):
                raise ValueError("Listado de objetos inesperado")
            if not items:
                break
            for item in items:
                name = item["name"]
                if not isinstance(name, str) or name in ("", ".", "..") or "/" in name or "\\" in name:
                    raise ValueError("Nombre de objeto no seguro")
                remote_path = prefix + name
                if item.get("id") is None:  # Carpeta virtual.
                    pending.append(remote_path + "/")
                    continue
                target = ROOT / bucket / remote_path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(request(
                    BASE + "/object/" + quote(bucket, safe="") + "/" + quote(remote_path, safe="/")
                ))
                files += 1
            if len(items) < 100:
                break
            offset += len(items)
    print(f"Storage {bucket}: {files} objetos")
    total += files
print(f"TOTAL_STORAGE={total}")
