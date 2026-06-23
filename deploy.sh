#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  while IFS='=' read -r _k _v; do
    [[ -z "$_k" || "$_k" == \#* ]] && continue
    if [ -z "${!_k:-}" ]; then export "${_k}=${_v}"; fi
  done < .env
fi

APP_PORT="${PORT:-8080}"

if ! command -v pnpm &>/dev/null; then npm install -g pnpm@10 --silent; fi

pnpm install --silent
BASE_PATH=/ PORT="$APP_PORT" pnpm --filter @workspace/new-world run build
pnpm --filter @workspace/api-server run build
mkdir -p artifacts/api-server/data

SERVE_STATIC_PATH="artifacts/new-world/dist/public" \
NODE_ENV=production \
PORT="$APP_PORT" \
  node --enable-source-maps artifacts/api-server/dist/index.mjs
