#!/usr/bin/env bash
set -euo pipefail

C='\033[0;36m'; G='\033[0;32m'; Y='\033[1;33m'; N='\033[0m'

echo -e "${C}  NEW WORLD — Setup${N}"
echo -e "${C}  @paxjest · antixss@outlook.com${N}"
echo ""

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
  echo -e "${G}✓ .env generated — SESSION_SECRET persisted${N}"
  echo -e "${Y}  ⚠  Back up your .env file or add SESSION_SECRET to Codespaces Secrets.${N}"
else
  echo -e "${G}✓ .env exists${N}"
fi

echo -e "${Y}→ Building frontend...${N}"
BASE_PATH=/ PORT=8080 pnpm --filter @workspace/new-world run build

echo -e "${Y}→ Building API server...${N}"
pnpm --filter @workspace/api-server run build

mkdir -p artifacts/api-server/data

echo ""
echo -e "${G}  ✓ Setup complete — run: bash start.sh${N}"
