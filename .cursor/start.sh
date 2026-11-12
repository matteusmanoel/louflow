#!/usr/bin/env bash
# Sobe Docker + Postgres local, aplica migrations/seed sintético e o Next.js em :3000.
# Só valores LOCAIS (compose) e sintéticos. Nenhum segredo real. Não fala com Neon/Vercel/WhatsApp/S3.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec 9>/tmp/louflow-start.lock
flock -w 300 9 || { echo "start.sh já em execução"; exit 1; }

# iptables-legacy: necessário no fallback da imagem padrão do Cursor (o Dockerfile já faz isso).
if command -v update-alternatives >/dev/null 2>&1; then
  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
fi

if ! docker info >/dev/null 2>&1 && [ -S /var/run/docker.sock ]; then
  sudo chgrp docker /var/run/docker.sock || true
  sudo chmod 660 /var/run/docker.sock || true
fi

if ! docker info >/dev/null 2>&1; then
  sudo service docker start >/dev/null 2>&1 || true
fi

if ! docker info >/dev/null 2>&1; then
  tmux has-session -t dockerd 2>/dev/null || \
    tmux new-session -d -s dockerd "sudo dockerd --host unix:///var/run/docker.sock --group docker" 9>&-
fi

for _ in $(seq 1 60); do
  docker info >/dev/null 2>&1 && break
  if [ -S /var/run/docker.sock ]; then
    sudo chgrp docker /var/run/docker.sock || true
    sudo chmod 660 /var/run/docker.sock || true
  fi
  sleep 1
done
docker info >/dev/null 2>&1 || { echo "Docker não subiu"; exit 1; }

if [ ! -f .env.local ]; then
  pepper="$(openssl rand -hex 32)"
  cron="$(openssl rand -hex 32)"
  meta="$(openssl rand -hex 32)"
  cat > .env.local <<ENVEOF
DATABASE_URL=postgresql://louflow:louflow@127.0.0.1:54329/louflow
DATABASE_URL_TEST=postgresql://louflow:louflow@127.0.0.1:54329/louflow_test
PIN_PEPPER=${pepper}
CRON_SECRET=${cron}
META_TOKEN_KEY=${meta}
ENVEOF
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a
unset DATABASE_URL_UNPOOLED DATABASE_URL_MIGRATE_DEVELOP DATABASE_URL_MIGRATE_MAIN \
  SEED_ALLOW_REMOTE SEED_REMOTE_HOSTS || true

url_host_port() {
  python3 -c 'from urllib.parse import urlparse; import sys
u = urlparse(sys.argv[1])
print((u.hostname or "") + " " + str(u.port or ""))' "$1"
}

exige_compose_local() {
  local nome="$1" url="${2:-}"
  if [ -z "$url" ]; then
    echo "Boot recusado: $nome ausente."
    exit 1
  fi
  local host port
  read -r host port <<<"$(url_host_port "$url")"
  case "$host" in
    127.0.0.1|localhost) ;;
    *)
      echo "Boot recusado: $nome não aponta para o Postgres local (compose)."
      exit 1
      ;;
  esac
  if [ "$port" != "54329" ]; then
    echo "Boot recusado: $nome não usa a porta 54329 do compose."
    exit 1
  fi
}

exige_compose_local DATABASE_URL "${DATABASE_URL:-}"
exige_compose_local DATABASE_URL_TEST "${DATABASE_URL_TEST:-}"

pnpm exec tsx -e "import { validarDestinoSeed } from './db/seed-guard.ts'; validarDestinoSeed(process.env.DATABASE_URL ?? '', { SEED_ALLOW_REMOTE: process.env.SEED_ALLOW_REMOTE, SEED_REMOTE_HOSTS: process.env.SEED_REMOTE_HOSTS })"

pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm exec tsx --conditions=react-server .cursor/pin-sintetico.ts

pronto() {
  curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3000 >/dev/null 2>&1
}

if ! pronto; then
  if tmux has-session -t dev 2>/dev/null && ! pronto; then
    tmux kill-session -t dev 2>/dev/null || true
  fi
  tmux has-session -t dev 2>/dev/null || tmux new-session -d -s dev \
    "cd '$ROOT' && set -a && source .env.local && set +a && export NEXT_TELEMETRY_DISABLED=1 && exec pnpm exec next dev --hostname 0.0.0.0 --port 3000" 9>&-
fi

for _ in $(seq 1 90); do
  pronto && break
  sleep 2
done
pronto || { echo "Next.js não respondeu em :3000"; exit 1; }
echo "LouFlow pronto na porta 3000 (tmux session: dev)"
