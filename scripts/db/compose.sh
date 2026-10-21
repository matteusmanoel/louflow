#!/bin/sh
# Usa `docker compose` (plugin) ou `docker-compose` (standalone), o que estiver disponível.
set -e
if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi
exec docker-compose "$@"
