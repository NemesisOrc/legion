# New World — Deployment Guide

**@paxjest** · [antixss@outlook.com](mailto:antixss@outlook.com)

---

## GitHub Codespaces (Recommended)

1. Push this repo to GitHub
2. Click **Code → Open with Codespaces**
3. *(Optional)* Add `SESSION_SECRET` to **Settings → Secrets → Codespaces** for persistence
4. Codespaces auto-runs `setup.sh` (install + build) and then `start.sh` (server) — no manual steps
5. Port **8080** opens in your browser automatically

---

## Manual Deploy (VPS / Local)

**Requirements:** Node.js 22+

```bash
bash install.sh
```

That's it. The script:
- Installs pnpm if missing
- Generates a persistent `.env` with `SESSION_SECRET` (only on first run)
- Installs all dependencies
- Builds frontend + API server
- Starts on **port 8080**

To use a different port:

```bash
PORT=3000 bash install.sh
```

---

## Script Reference

| Script | Purpose |
|--------|---------|
| `install.sh` | Full one-command deploy (install + build + start) |
| `setup.sh` | Install + build only (no server start) |
| `start.sh` | Start server (reads `.env` automatically) |
| `deploy.sh` | Minimal rebuild + start (CI-friendly) |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | **Yes** | Token signing key — auto-generated on first run |
| `PORT` | No | Server port (default: `8080`) |

The `.env` file is created automatically on first run. Back it up — losing `SESSION_SECRET` invalidates all active admin sessions.

Generate a new secret manually:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Data Storage

All data is stored in `artifacts/api-server/data/`:

| File | Contents |
|------|---------|
| `accounts.json` | Admin credentials (HMAC-SHA256 hashed) |
| `sitedata.json` | Members, timeline, news, Discord link |
| `maintenance.json` | Maintenance mode state |

Back up this folder alongside `.env` to preserve all data.

---

## Architecture

```
bash install.sh
    │
    ├─ pnpm install
    ├─ vite build  ──► artifacts/new-world/dist/public/
    ├─ esbuild     ──► artifacts/api-server/dist/index.mjs
    └─ node dist/index.mjs  (port 8080)
            │
            ├─ GET /api/*   → REST API routes
            ├─ GET /*       → Serves built Vite app
            └─ data/        → JSON file persistence
```

Single process, single port — no nginx or reverse proxy needed.
Cloudflare Tunnel works out of the box.
