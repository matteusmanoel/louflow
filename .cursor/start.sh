#!/usr/bin/env bash
# Sobe Docker + Postgres local, aplica migrations/seed sintético e o Next.js em :3000.
# Só valores LOCAIS (compose) e sintéticos. Nenhum segredo real. Não fala com Neon/Vercel/WhatsApp/S3.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v update-alternatives >/dev/null 2>&1; then
  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
fi

if [ -S /var/run/docker.sock ]; then
  sudo chmod 666 /var/run/docker.sock || true
fi

if ! docker info >/dev/null 2>&1; then
  sudo service docker start >/dev/null 2>&1 || true
fi

if ! docker info >/dev/null 2>&1; then
  tmux has-session -t dockerd 2>/dev/null || \
    tmux new-session -d -s dockerd "sudo dockerd --host unix:///var/run/docker.sock"
fi

for _ in $(seq 1 60); do
  if [ -S /var/run/docker.sock ]; then
    sudo chmod 666 /var/run/docker.sock || true
  fi
  docker info >/dev/null 2>&1 && break
  sleep 1
done
docker info >/dev/null 2>&1 || { echo "Docker não subiu"; exit 1; }

if [ ! -f .env.local ]; then
  cat > .env.local <<'ENVEOF'
DATABASE_URL=postgresql://louflow:louflow@127.0.0.1:54329/louflow
DATABASE_URL_TEST=postgresql://louflow:louflow@127.0.0.1:54329/louflow_test
PIN_PEPPER=pepper-de-teste-com-mais-de-32-caracteres-0001
CRON_SECRET=segredo-de-teste
META_TOKEN_KEY=chave-de-teste-meta-com-32-caracteres
ENVEOF
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

pnpm db:up
pnpm db:migrate
pnpm db:seed

# PIN sintético já usado em e2e/ e tests/helpers/db.ts. Só preenche @exemplo.test sem PIN.
pnpm exec tsx --conditions=react-server --env-file=.env.local <<'EOF'
import postgres from 'postgres';
import { gerarHashPin } from './lib/pin.ts';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const [row] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM users
      WHERE email LIKE '%@exemplo.test' AND pin_hash IS NULL`;
    if ((row?.n ?? 0) > 0) {
      const hash = await gerarHashPin('482916');
      await sql`
        UPDATE users
        SET pin_hash = ${hash}, must_reset_pin = false
        WHERE email LIKE '%@exemplo.test' AND pin_hash IS NULL`;
      console.log('PIN sintético definido para usuários @exemplo.test sem PIN.');
    } else {
      console.log('PIN sintético já presente (ou nenhum usuário sintético sem PIN).');
    }
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
EOF

pronto() {
  curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3000 >/dev/null 2>&1
}

if ! pronto; then
  if tmux has-session -t dev 2>/dev/null && ! pronto; then
    tmux kill-session -t dev 2>/dev/null || true
  fi
  tmux has-session -t dev 2>/dev/null || tmux new-session -d -s dev \
    "cd '$ROOT' && set -a && source .env.local && set +a && export NEXT_TELEMETRY_DISABLED=1 && exec pnpm exec next dev --hostname 0.0.0.0 --port 3000"
fi

for _ in $(seq 1 90); do
  pronto && break
  sleep 2
done
pronto || { echo "Next.js não respondeu em :3000"; exit 1; }
echo "LouFlow pronto em http://127.0.0.1:3000 (tmux session: dev)"
