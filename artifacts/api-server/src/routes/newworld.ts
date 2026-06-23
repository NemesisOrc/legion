import { Router, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { fileGet, fileSet } from "../lib/storage";

const router = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] || "nw_fallback_secret_change_in_production";
const SALT = "nw_secure_salt_2026";
const MAX_BODY_STR = 500;

function s(val: unknown, max = MAX_BODY_STR): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, max);
}

function hashPassword(password: string): string {
  return createHmac("sha256", SALT).update(password).digest("hex");
}

function makeToken(username: string): string {
  const expiry = Date.now() + 30 * 60 * 1000;
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(`${username}:${expiry}`)
    .digest("hex");
  return Buffer.from(`${username}:${expiry}:${sig}`).toString("base64url");
}

function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const sig = decoded.slice(lastColon + 1);
    const rest = decoded.slice(0, lastColon);
    const parts = rest.split(":");
    const expiry = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!expiry || Date.now() > expiry) return null;
    const username = parts.slice(0, -1).join(":");
    if (!username) return null;
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(`${username}:${expiry}`)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || sigBuf.length === 0) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return username;
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const user = verifyToken(auth.slice(7));
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return null;
  }
  return user;
}

const loginRateLimiter = (() => {
  const store = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (now > val.resetAt) store.delete(key);
    }
  }, 10 * 60 * 1000).unref();

  return {
    check(ip: string): { limited: boolean; retryAfter: number } {
      const MAX = 10;
      const WINDOW = 15 * 60 * 1000;
      const now = Date.now();
      let entry = store.get(ip);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + WINDOW };
        store.set(ip, entry);
      }
      entry.count++;
      return {
        limited: entry.count > MAX,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    },
    reset(ip: string) {
      store.delete(ip);
    },
  };
})();

type Account = { username: string; passwordHash: string; createdAt: number; isSuperAdmin?: boolean };
type MaintenanceData = { enabled: boolean; message: string; eta: string };

const DEFAULT_SITEDATA = {
  members: [
    { id: "m1", handle: "@Paxjest", role: "Founder & Admiral", name: "Paxjest", quote: "Creating chaos since day one.", traits: ["Strategy", "Leadership", "Chaos"], avatar: "", kanji: "覇", colors: ["#a855f7", "#ec4899"], isAwaiting: false },
    { id: "m2", handle: "", role: "", name: "", quote: "", traits: ["", "", ""], avatar: "", kanji: "力", colors: ["#3b82f6", "#06b6d4"], isAwaiting: true },
    { id: "m3", handle: "", role: "", name: "", quote: "", traits: ["", "", ""], avatar: "", kanji: "力", colors: ["#10b981", "#84cc16"], isAwaiting: true },
  ],
  timeline: [
    { id: "t1", date: "Jan 2024", label: "New World founded — the first step into the unknown.", icon: "🌊" },
    { id: "t2", date: "Mar 2024", label: "First 50 members joined the crew.", icon: "⚔️" },
    { id: "t3", date: "Jun 2024", label: "Major alliance formed with rival crews.", icon: "🤝" },
    { id: "t4", date: "Dec 2024", label: "Reached the top of the server leaderboard.", icon: "👑" },
    { id: "t5", date: "Jun 2025", label: "Season 2 begins — new adventures await.", icon: "🚀" },
  ],
  news: [
    { id: "n1", date: "Jun 2026", title: "Season 3 Announcement", body: "The crew sets sail once more. New World Season 3 kicks off with new challenges, new alliances, and new enemies." },
    { id: "n2", date: "May 2026", title: "Recruitment Open", body: "We are looking for skilled fighters to join our ranks. Apply in the Discord server." },
  ],
  discordInvite: "https://discord.gg/5N9J8Y3atM",
};

const DEFAULT_MAINTENANCE: MaintenanceData = { enabled: false, message: "", eta: "" };

function isValidUsername(u: string): boolean {
  return u.length >= 3 && u.length <= 40 && /^[a-zA-Z0-9_]+$/.test(u);
}

function isValidSiteData(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d["members"]) || !Array.isArray(d["timeline"]) || !Array.isArray(d["news"])) return false;
  if (d["members"].length > 50 || d["timeline"].length > 100 || d["news"].length > 100) return false;
  if (typeof d["discordInvite"] !== "string") return false;
  return true;
}

async function getAccounts(): Promise<Account[]> {
  const stored = await fileGet<Account[]>("accounts.json");
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  const defaults: Account[] = [{
    username: "Pax005",
    passwordHash: hashPassword("unclearjest@22"),
    createdAt: Date.now(),
    isSuperAdmin: true,
  }];
  await fileSet("accounts.json", defaults);
  return defaults;
}

router.get("/sitedata", async (_req, res) => {
  const data = await fileGet("sitedata.json") ?? DEFAULT_SITEDATA;
  res.json(data);
});

router.put("/sitedata", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (!isValidSiteData(req.body)) {
    res.status(400).json({ error: "Invalid site data structure" });
    return;
  }
  await fileSet("sitedata.json", req.body);
  res.json({ ok: true });
});

router.get("/maintenance", async (_req, res) => {
  const data = await fileGet<MaintenanceData>("maintenance.json") ?? DEFAULT_MAINTENANCE;
  res.json(data);
});

router.put("/maintenance", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { enabled, message, eta } = req.body ?? {};
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const data: MaintenanceData = {
    enabled,
    message: s(message, 500),
    eta: s(eta, 100),
  };
  await fileSet("maintenance.json", data);
  res.json({ ok: true });
});

router.post("/admin/login", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const rate = loginRateLimiter.check(ip);
  if (rate.limited) {
    res.status(429).json({ error: `Too many attempts. Try again in ${rate.retryAfter}s.` });
    return;
  }

  const username = s(req.body?.username, 50);
  const password = s(req.body?.password, 200);
  if (!username || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  const accounts = await getAccounts();
  const hash = hashPassword(password);
  const account = accounts.find(
    a => a.username.toLowerCase() === username.toLowerCase() && a.passwordHash === hash,
  );

  if (!account) {
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  loginRateLimiter.reset(ip);
  res.json({ token: makeToken(account.username), username: account.username });
});

router.get("/admin/accounts", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const accounts = await getAccounts();
  res.json(accounts.map(a => ({ username: a.username, createdAt: a.createdAt, isSuperAdmin: a.isSuperAdmin ?? false })));
});

router.post("/admin/accounts", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const username = s(req.body?.username, 40);
  const password = s(req.body?.password, 200);

  if (!username || !password) { res.status(400).json({ error: "Missing fields" }); return; }
  if (!isValidUsername(username)) { res.status(400).json({ error: "Username: 3–40 chars, letters/numbers/underscores only" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const accounts = await getAccounts();
  if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    res.status(409).json({ error: "Username already exists" }); return;
  }
  accounts.push({ username, passwordHash: hashPassword(password), createdAt: Date.now() });
  await fileSet("accounts.json", accounts);
  res.json({ ok: true });
});

router.delete("/admin/accounts/:username", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const target = s(req.params["username"] ?? "", 40);
  if (!target) { res.status(400).json({ error: "Missing username" }); return; }
  if (target.toLowerCase() === user.toLowerCase()) {
    res.status(400).json({ error: "Cannot remove your own account" }); return;
  }

  const accounts = await getAccounts();
  const filtered = accounts.filter(a => a.username.toLowerCase() !== target.toLowerCase());
  if (filtered.length === accounts.length) { res.status(404).json({ error: "Account not found" }); return; }
  if (filtered.length === 0) { res.status(400).json({ error: "Cannot remove last admin" }); return; }

  await fileSet("accounts.json", filtered);
  res.json({ ok: true });
});

router.put("/admin/password", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const username = s(req.body?.username, 40);
  const newPassword = s(req.body?.newPassword, 200);

  if (!username || !newPassword) { res.status(400).json({ error: "Missing fields" }); return; }
  if (newPassword.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const accounts = await getAccounts();
  const idx = accounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
  if (idx === -1) { res.status(404).json({ error: "Account not found" }); return; }

  accounts[idx]!.passwordHash = hashPassword(newPassword);
  await fileSet("accounts.json", accounts);
  res.json({ ok: true });
});

export default router;
