export const TIMELINE_ICONS = ["⚡","🔥","💀","⚔️","🏆","🎯","🌊","💎","🚀","🌟","🎮","💥","👑","🔱","⛩️","🐉","🗡️","🛡️","🌙","☄️","🎭","🎪","🦅","🐺","🤝","🏴‍☠️","🔮","⚗️"];
export const KANJI_OPTIONS = ["力","剣","炎","海","空","闇","光","魂","鬼","龍","虎","風","雷","刃","覇","極","神","鋼","嵐","零"];
export const COLOR_PRESETS: [string, string][] = [
  ["#a855f7","#ec4899"],["#3b82f6","#06b6d4"],["#10b981","#84cc16"],
  ["#f59e0b","#ef4444"],["#8b5cf6","#6366f1"],["#f43f5e","#fb7185"],
  ["#06b6d4","#a855f7"],["#fbbf24","#f97316"],
];

export type Member = {
  id: string; handle: string; role: string; name: string; quote: string;
  traits: [string, string, string]; avatar: string; kanji: string;
  colors: [string, string]; isAwaiting: boolean;
};
export type TimelineItem = { id: string; date: string; label: string; icon: string };
export type NewsItem = { id: string; date: string; title: string; body: string };
export type SiteData = { members: Member[]; timeline: TimelineItem[]; news: NewsItem[]; discordInvite: string };

const CACHE_KEY = "nw_site_data_cache_v2";

export const DEFAULT_DATA: SiteData = {
  members: [
    { id: "m1", handle: "@Paxjest", role: "Founder & Admiral", name: "Paxjest", quote: "Creating chaos since day one.", traits: ["Strategy","Leadership","Chaos"], avatar: "/paxjest.png", kanji: "覇", colors: COLOR_PRESETS[0], isAwaiting: false },
    { id: "m2", handle: "", role: "", name: "", quote: "", traits: ["","",""], avatar: "", kanji: "力", colors: COLOR_PRESETS[1], isAwaiting: true },
    { id: "m3", handle: "", role: "", name: "", quote: "", traits: ["","",""], avatar: "", kanji: "力", colors: COLOR_PRESETS[2], isAwaiting: true },
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

function getCached(): SiteData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCache(data: SiteData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

export function loadDataSync(): SiteData {
  return getCached() ?? { ...DEFAULT_DATA };
}

export async function loadData(): Promise<SiteData> {
  try {
    const res = await fetch("/api/sitedata");
    if (!res.ok) throw new Error("fetch failed");
    const raw = await res.json();
    const data: SiteData = {
      members: raw.members ?? DEFAULT_DATA.members,
      timeline: raw.timeline ?? DEFAULT_DATA.timeline,
      news: raw.news ?? DEFAULT_DATA.news,
      discordInvite: raw.discordInvite ?? DEFAULT_DATA.discordInvite,
    };
    setCache(data);
    return data;
  } catch {
    return getCached() ?? { ...DEFAULT_DATA };
  }
}

export async function saveData(data: SiteData, token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/sitedata", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (res.ok) { setCache(data); return true; }
    return false;
  } catch { return false; }
}

export function sanitize(str: string): string {
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;")
    .slice(0, 500).trim();
}
