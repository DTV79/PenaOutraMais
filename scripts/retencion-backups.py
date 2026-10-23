#!/usr/bin/env python3
"""Mantiene 8 copias automáticas, sin tocar las copias manuales."""
import datetime as dt
import re
import subprocess

REMOTE = "cofradia_cifrado:PenaOutraMais/automaticas"
PATTERN = re.compile(r"^backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/$")

def rclone(*args):
    return subprocess.check_output(["rclone", *args], text=True).strip()

backups = []
for name in rclone("lsf", REMOTE, "--dirs-only").splitlines():
    match = PATTERN.fullmatch(name)
    if match:
        stamp = dt.datetime.strptime(match.group(1) + "_" + match.group(2), "%Y-%m-%d_%H-%M-%S")
        backups.append((stamp, name))

backups.sort(reverse=True)
if not backups:
    raise SystemExit("Sin copias verificables; no se elimina nada.")
print(f"Copias automáticas: {len(backups)}; conservar: {min(8, len(backups))}")
for _, name in backups[8:]:
    subprocess.run(["rclone", "purge", REMOTE + "/" + name.rstrip("/")], check=True)
    print("Eliminada copia antigua:", name)
