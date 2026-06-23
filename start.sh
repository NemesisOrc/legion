#!/usr/bin/env bash
set -euo pipefail

C='\033[0;36m'; G='\033[0;32m'; N='\033[0m'

if [ -f .env ]; then
  while IFS='=' read -r _k _v; do
    [[ -z "$_k" || "$_k" == \#* ]] && continue
    if [ -z "${!_k:-}" ]; then
      export "${_k}=${_v}"
    fi
  done < .env
fi

APP_PORT="${PORT:-8080}"

echo ""
echo -e "${C}  NEW WORLD is starting...${N}"
echo -e "${C}  @paxjest · antixss@outlook.com${N}"
echo -e "${G}  → http://localhost:${APP_PORT}${N}"
echo ""

SERVE_STATIC_PATH="artifacts/new-world/dist/public" \
NODE_ENV=production \
PORT="$APP_PORT" \
  node --enable-source-maps artifacts/api-server/dist/index.mjs
