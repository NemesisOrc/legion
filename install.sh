#!/usr/bin/env bash
set -euo pipefail

R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; W='\033[1;37m'; N='\033[0m'

echo ""
echo -e "${C}  ╔══════════════════════════════════════╗${N}"
echo -e "${C}  ║        NEW WORLD — Installer         ║${N}"
echo -e "${C}  ║  @paxjest · antixss@outlook.com      ║${N}"
echo -e "${C}  ╚══════════════════════════════════════╝${N}"
echo ""

if ! command -v node &>/dev/null; then
  echo -e "${R}✗ Node.js not found. Install Node.js 22+ and retry.${N}"; exit 1
fi
NODE_MAJOR=$(node -e "process.stdout.write(String(parseInt(process.version.slice(1))))")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${R}✗ Node.js 20+ required. Found: $(node --version)${N}"; exit 1
fi
echo -e "${G}✓ Node.js $(node --version)${N}"

if ! command -v pnpm &>/dev/null; then
  echo -e "${Y}→ Installing pnpm...${N}"
  npm install -g pnpm@10 --silent
fi
echo -e "${G}✓ pnpm $(pnpm --version)${N}"

echo -e "${Y}→ Installing dependencies...${N}"
pnpm install --silent

if [ ! -f .env ]; then
  SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  printf 'SESSION_SECRET=%s\nPORT=8080\n' "$SECRET" > .env
  echo -e "${G}✓ .env generated — SESSION_SECRET saved${N}"
  echo -e "${Y}  ⚠  Back up .env or add SESSION_SECRET to Codespaces Secrets for persistence.${N}"
else
  echo -e "${G}✓ .env already exists${N}"
fi

while IFS='=' read -r _k _v; do
  [[ -z "$_k" || "$_k" == \#* ]] && continue
  if [ -z "${!_k:-}" ]; then export "${_k}=${_v}"; fi
done < .env

echo -e "${Y}→ Building frontend...${N}"
BASE_PATH=/ PORT="${PORT:-8080}" pnpm --filter @workspace/new-world run build

echo -e "${Y}→ Building API server...${N}"
pnpm --filter @workspace/api-server run build

mkdir -p artifacts/api-server/data

APP_PORT="${PORT:-8080}"

echo ""
echo -e "${W}  ╔══════════════════════════════════════╗${N}"
echo -e "${W}  ║  Ready!  http://localhost:${APP_PORT}       ║${N}"
echo -e "${W}  ╚══════════════════════════════════════╝${N}"
echo ""

SERVE_STATIC_PATH="artifacts/new-world/dist/public" \
NODE_ENV=production \
PORT="$APP_PORT" \
  node --enable-source-maps artifacts/api-server/dist/index.mjs
