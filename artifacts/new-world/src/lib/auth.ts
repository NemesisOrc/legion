const SESSION_KEY = "nw_admin_session_v3";
const RATE_KEY = "nw_admin_rate_v2";

export type AdminAccount = { username: string; createdAt: number; isSuperAdmin?: boolean };

export async function loginAdmin(username: string, password: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.token ?? null;
  } catch { return null; }
}

export function isAuthed(): boolean {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return false;
    const parsed = JSON.parse(s);
    if (Date.now() > parsed.exp) { sessionStorage.removeItem(SESSION_KEY); return false; }
    return !!parsed.token;
  } catch { return false; }
}

export function getToken(): string {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return "";
    return JSON.parse(s).token ?? "";
  } catch { return ""; }
}

export function getCurrentUser(): string {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return "";
    return JSON.parse(s).user ?? "";
  } catch { return ""; }
}

export function setSession(username: string, token: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    exp: Date.now() + 30 * 60 * 1000,
    user: username,
    token,
  }));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getRateData(): { attempts?: number; lockUntil?: number } {
  try { return JSON.parse(sessionStorage.getItem(RATE_KEY) || "{}"); } catch { return {}; }
}

export function setRateData(d: object) {
  sessionStorage.setItem(RATE_KEY, JSON.stringify(d));
}

export function clearRateData() {
  sessionStorage.removeItem(RATE_KEY);
}

export async function listAdminAccounts(token: string): Promise<AdminAccount[]> {
  try {
    const res = await fetch("/api/admin/accounts", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function createAdminAccount(token: string, username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch { return { ok: false, error: "Network error" }; }
}

export async function changePassword(token: string, username: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, newPassword }),
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch { return { ok: false, error: "Network error" }; }
}

export async function removeAdminAccount(token: string, username: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch { return { ok: false, error: "Network error" }; }
}
