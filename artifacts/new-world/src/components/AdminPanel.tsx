import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadDataSync, saveData, sanitize,
  TIMELINE_ICONS, KANJI_OPTIONS, COLOR_PRESETS,
  type Member, type TimelineItem, type NewsItem, type SiteData,
} from "@/lib/store";
import {
  isAuthed, setSession, clearSession, loginAdmin, getToken, getCurrentUser,
  getRateData, setRateData, clearRateData,
  listAdminAccounts, createAdminAccount, changePassword, removeAdminAccount,
  type AdminAccount,
} from "@/lib/auth";
import { soundEngine } from "@/lib/sound";

async function resizeImage(file: File, maxPx = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/webp", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image failed")); };
    img.src = url;
  });
}

const EMPTY_MEMBER = (): Partial<Member> => ({
  handle: "", role: "", name: "", quote: "",
  traits: ["", "", ""], avatar: "", kanji: "力",
  colors: COLOR_PRESETS[0], isAwaiting: false,
});

type Tab = "members" | "timeline" | "news" | "security" | "site";

export default function AdminPanel({ onRefresh }: { onRefresh: () => void }) {
  const [authed, setAuthed] = useState(isAuthed);
  const [loginOpen, setLoginOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("members");
  const [data, setDataState] = useState<SiteData>(loadDataSync);
  const [saving, setSaving] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Member>>(EMPTY_MEMBER());
  const [addingTimeline, setAddingTimeline] = useState(false);
  const [newTl, setNewTl] = useState<Partial<TimelineItem>>({ date: "", label: "", icon: "⚡" });
  const [addingNews, setAddingNews] = useState(false);
  const [newNews, setNewNews] = useState<Partial<NewsItem>>({ date: "", title: "", body: "" });
  const [discordLink, setDiscordLink] = useState("");
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [newAccUser, setNewAccUser] = useState("");
  const [newAccPass, setNewAccPass] = useState("");
  const [newAccMsg, setNewAccMsg] = useState({ err: "", ok: "" });
  const [changePwUser, setChangePwUser] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwMsg, setChangePwMsg] = useState({ err: "", ok: "" });
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintMessage, setMaintMessage] = useState("");
  const [maintEta, setMaintEta] = useState("");
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintSaved, setMaintSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const persistData = useCallback(async (next: SiteData) => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setDataState(next);
    const ok = await saveData(next, token);
    setSaving(false);
    if (ok) onRefresh();
  }, [onRefresh]);

  const refreshAccounts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const list = await listAdminAccounts(token);
    setAccounts(list);
  }, []);

  const fetchMaintenance = useCallback(async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        const d = await res.json();
        setMaintEnabled(d.enabled ?? false);
        setMaintMessage(d.message ?? "");
        setMaintEta(d.eta ?? "");
      }
    } catch {}
  }, []);

  const openPanel = useCallback(async () => {
    setCurrentUser(getCurrentUser());
    try {
      const res = await fetch("/api/sitedata");
      if (res.ok) {
        const fresh = await res.json();
        setDataState(fresh);
        setDiscordLink(fresh.discordInvite ?? "");
      }
    } catch {}
    await Promise.all([refreshAccounts(), fetchMaintenance()]);
    setPanelOpen(true);
  }, [refreshAccounts, fetchMaintenance]);

  useEffect(() => {
    if (panelOpen && discordLink === "") setDiscordLink(data.discordInvite);
  }, [panelOpen, data.discordInvite, discordLink]);

  const handleLogin = useCallback(async () => {
    const rate = getRateData();
    if (rate.lockUntil && Date.now() < rate.lockUntil) {
      setLoginErr(`Too many attempts. Wait ${Math.ceil((rate.lockUntil - Date.now()) / 1000)}s.`); return;
    }
    setLoginLoading(true);
    const token = await loginAdmin(u, p);
    if (token) {
      setSession(u, token);
      setAuthed(true);
      setLoginOpen(false);
      setU(""); setP(""); setLoginErr("");
      clearRateData();
      soundEngine.uiTone(880, 0.12);
      await openPanel();
    } else {
      const attempts = (rate.attempts || 0) + 1;
      const next: Record<string, number> = { attempts };
      if (attempts >= 5) next.lockUntil = Date.now() + 90000;
      setRateData(next);
      setLoginErr(attempts >= 5 ? "Account locked for 90 seconds." : `Invalid credentials. ${5 - attempts} attempt${5 - attempts === 1 ? "" : "s"} left.`);
    }
    setLoginLoading(false);
  }, [u, p, openPanel]);

  const openAdmin = () => {
    soundEngine.click();
    if (isAuthed()) { setAuthed(true); openPanel(); } else setLoginOpen(true);
  };

  const handleLogout = () => { clearSession(); setAuthed(false); setPanelOpen(false); soundEngine.uiTone(440, 0.1); };

  const saveSettings = async () => {
    soundEngine.click();
    await persistData({ ...data, discordInvite: sanitize(discordLink) });
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const saveMaintenance = async () => {
    const token = getToken();
    if (!token) return;
    soundEngine.click();
    setMaintSaving(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: maintEnabled, message: maintMessage, eta: maintEta }),
      });
      if (res.ok) {
        setMaintSaved(true);
        setTimeout(() => setMaintSaved(false), 2400);
        soundEngine.uiTone(maintEnabled ? 440 : 880, 0.14);
        onRefresh();
      }
    } catch {}
    setMaintSaving(false);
  };

  const addMember = async () => {
    if (!newMember.handle && !newMember.isAwaiting) return;
    soundEngine.uiTone(660, 0.1);
    const m: Member = {
      id: `m${Date.now()}`, handle: sanitize(newMember.handle || ""), role: sanitize(newMember.role || ""),
      name: sanitize(newMember.name || ""), quote: sanitize(newMember.quote || ""),
      traits: [sanitize(newMember.traits?.[0] || ""), sanitize(newMember.traits?.[1] || ""), sanitize(newMember.traits?.[2] || "")] as [string, string, string],
      avatar: newMember.avatar || "", kanji: newMember.kanji || "力",
      colors: newMember.colors || COLOR_PRESETS[0], isAwaiting: !!newMember.isAwaiting,
    };
    await persistData({ ...data, members: [...data.members, m] });
    setNewMember(EMPTY_MEMBER()); setAddingMember(false);
  };

  const removeMember = async (id: string) => { soundEngine.click(); await persistData({ ...data, members: data.members.filter(m => m.id !== id) }); };

  const addTimeline = async () => {
    if (!newTl.date || !newTl.label) return;
    soundEngine.uiTone(660, 0.1);
    await persistData({ ...data, timeline: [...data.timeline, { id: `t${Date.now()}`, date: sanitize(newTl.date!), label: sanitize(newTl.label!), icon: newTl.icon || "⚡" }] });
    setNewTl({ date: "", label: "", icon: "⚡" }); setAddingTimeline(false);
  };

  const removeTl = async (id: string) => { soundEngine.click(); await persistData({ ...data, timeline: data.timeline.filter(t => t.id !== id) }); };

  const addNews = async () => {
    if (!newNews.title) return;
    soundEngine.uiTone(660, 0.1);
    await persistData({ ...data, news: [{ id: `n${Date.now()}`, date: sanitize(newNews.date || ""), title: sanitize(newNews.title!), body: sanitize(newNews.body || "") }, ...data.news] });
    setNewNews({ date: "", title: "", body: "" }); setAddingNews(false);
  };

  const removeNews = async (id: string) => { soundEngine.click(); await persistData({ ...data, news: data.news.filter(n => n.id !== id) }); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setLoginErr("File too large (max 5MB)."); return; }
    try { const b64 = await resizeImage(file); setNewMember(prev => ({ ...prev, avatar: b64 })); }
    catch { setLoginErr("Image error."); }
  };

  const handleCreateAccount = async () => {
    setNewAccMsg({ err: "", ok: "" });
    const token = getToken();
    if (!token) { setNewAccMsg({ err: "Session expired. Re-login.", ok: "" }); return; }
    const res = await createAdminAccount(token, newAccUser, newAccPass);
    if (res.ok) { setNewAccMsg({ err: "", ok: "Account created." }); setNewAccUser(""); setNewAccPass(""); await refreshAccounts(); soundEngine.uiTone(880, 0.15); }
    else setNewAccMsg({ err: res.error || "Failed.", ok: "" });
  };

  const handleChangePassword = async () => {
    setChangePwMsg({ err: "", ok: "" });
    if (!changePwUser) { setChangePwMsg({ err: "Select a user.", ok: "" }); return; }
    const token = getToken();
    if (!token) { setChangePwMsg({ err: "Session expired.", ok: "" }); return; }
    const res = await changePassword(token, changePwUser, changePwNew);
    if (res.ok) { setChangePwMsg({ err: "", ok: "Password updated." }); setChangePwNew(""); soundEngine.uiTone(880, 0.15); }
    else setChangePwMsg({ err: res.error || "Failed.", ok: "" });
  };

  const handleRemoveAccount = async (username: string) => {
    const token = getToken();
    if (!token) return;
    const res = await removeAdminAccount(token, username);
    if (res.ok) { await refreshAccounts(); soundEngine.click(); }
    else setChangePwMsg({ err: res.error || "Failed.", ok: "" });
  };

  const ic = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-purple-500/50 placeholder-white/20 transition-colors";
  const lc = "text-[10px] font-mono uppercase tracking-widest text-white/35 mb-1 block";
  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: "Crew" },
    { key: "timeline", label: "Story" },
    { key: "news", label: "News" },
    { key: "security", label: "Security" },
    { key: "site", label: "Site" },
  ];

  return (
    <>
      <button
        onClick={openAdmin}
        aria-label="Admin panel"
        className="fixed top-4 right-4 z-[110] flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.12))", border: "1px solid rgba(168,85,247,0.3)", backdropFilter: "blur(12px)", color: "rgba(196,132,252,0.9)" }}
        onMouseEnter={e => { soundEngine.hover(); (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(168,85,247,0.3)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        Admin
      </button>

      <AnimatePresence>
        {loginOpen && (
          <motion.div className="fixed inset-0 z-[120] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setLoginOpen(false)} />
            <motion.div className="relative z-10 w-full max-w-sm rounded-2xl p-7" initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }} transition={{ type: "spring", stiffness: 340, damping: 30 }}
              style={{ background: "linear-gradient(155deg, rgba(20,10,42,0.98), rgba(8,4,22,0.99))", border: "1px solid rgba(168,85,247,0.25)", boxShadow: "0 0 60px rgba(168,85,247,0.12)" }}>
              <div className="flex items-center gap-2.5 mb-7">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(196,132,252,0.9)" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <span className="text-sm font-black tracking-widest uppercase text-white/80">Admin Access</span>
              </div>
              <div className="space-y-4 mb-6">
                <div><label className={lc}>Username</label><input className={ic} value={u} onChange={e => setU(e.target.value)} placeholder="Username" autoComplete="username" maxLength={50} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                <div><label className={lc}>Password</label><input className={ic} type="password" value={p} onChange={e => setP(e.target.value)} placeholder="Password" autoComplete="current-password" maxLength={200} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                {loginErr && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-red-400/80 text-xs font-mono">{loginErr}</motion.p>}
              </div>
              <button onClick={handleLogin} disabled={loginLoading} className="w-full py-3 rounded-xl text-sm font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>
                {loginLoading ? "Verifying…" : "Enter"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div className="fixed inset-0 z-[115] bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanelOpen(false)} />
            <motion.div className="fixed right-0 top-0 bottom-0 z-[116] flex flex-col" style={{ width: "min(480px, 100vw)", background: "linear-gradient(160deg, rgba(14,6,34,0.99), rgba(5,2,16,0.99))", borderLeft: "1px solid rgba(168,85,247,0.18)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 34 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <span className="text-sm font-black tracking-widest uppercase" style={{ background: "linear-gradient(135deg, #c084fc, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Admin Panel</span>
                  {currentUser && <p className="text-[10px] text-white/25 font-mono mt-0.5">{currentUser}</p>}
                  {saving && <p className="text-[10px] text-purple-400/50 font-mono mt-0.5">Saving…</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleLogout} className="text-white/20 hover:text-red-400/60 transition-colors cursor-pointer text-xs font-mono tracking-widest px-2 py-1" onMouseEnter={() => soundEngine.hover()}>LOGOUT</button>
                  <button onClick={() => setPanelOpen(false)} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer text-xl leading-none w-8 h-8 flex items-center justify-center" onMouseEnter={() => soundEngine.hover()}>✕</button>
                </div>
              </div>
              <div className="flex border-b border-white/[0.06] overflow-x-auto">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => { soundEngine.click(); setTab(t.key); }} className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer whitespace-nowrap px-2"
                    style={{ color: tab === t.key ? "rgba(196,132,252,0.9)" : "rgba(255,255,255,0.25)", borderBottom: tab === t.key ? "2px solid #a855f7" : "2px solid transparent" }}
                    onMouseEnter={() => soundEngine.hover()}>{t.label}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {tab === "members" && (<>
                  {data.members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3">
                        {m.avatar ? <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-purple-500/30" /> : <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 text-xs">{m.kanji || "?"}</div>}
                        <div><p className="text-white/70 text-xs font-semibold">{m.isAwaiting ? "— Awaiting —" : m.handle}</p><p className="text-white/30 text-[10px] font-mono">{m.isAwaiting ? "Empty slot" : m.role}</p></div>
                      </div>
                      <button onClick={() => removeMember(m.id)} className="text-red-400/40 hover:text-red-400/80 text-xs transition-colors cursor-pointer px-2 py-1" onMouseEnter={() => soundEngine.hover()}>✕</button>
                    </div>
                  ))}
                  {!addingMember ? (
                    <button onClick={() => { soundEngine.click(); setAddingMember(true); }} className="w-full py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase border border-dashed border-purple-500/25 text-purple-400/50 hover:border-purple-500/50 hover:text-purple-400/80 transition-all cursor-pointer" onMouseEnter={() => soundEngine.hover()}>+ Add Vanguard Member</button>
                  ) : (
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)" }}>
                      <p className="text-xs font-bold text-purple-300/70 tracking-widest uppercase">New Member</p>
                      <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!newMember.isAwaiting} onChange={e => setNewMember(prev => ({ ...prev, isAwaiting: e.target.checked }))} /><span className="text-xs text-white/50">Awaiting slot (empty card)</span></label>
                      {!newMember.isAwaiting && (<>
                        <div><label className={lc}>Discord Handle</label><input className={ic} placeholder="@username" maxLength={50} value={newMember.handle} onChange={e => setNewMember(prev => ({ ...prev, handle: e.target.value }))} /></div>
                        <div><label className={lc}>Real Name</label><input className={ic} placeholder="Name" maxLength={80} value={newMember.name} onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))} /></div>
                        <div><label className={lc}>Role</label><input className={ic} placeholder="e.g. Tax Deputy" maxLength={80} value={newMember.role} onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value }))} /></div>
                        <div><label className={lc}>Tagline</label><input className={ic} placeholder="Creating problems since..." maxLength={200} value={newMember.quote} onChange={e => setNewMember(prev => ({ ...prev, quote: e.target.value }))} /></div>
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map(i => <div key={i}><label className={lc}>Skill {i + 1}</label><input className={ic} placeholder="Skill" maxLength={40} value={newMember.traits?.[i] || ""} onChange={e => { const t = [...(newMember.traits || ["", "", ""])] as [string, string, string]; t[i] = e.target.value; setNewMember(prev => ({ ...prev, traits: t })); }} /></div>)}
                        </div>
                        <div>
                          <label className={lc}>Avatar URL or Upload</label>
                          <div className="flex gap-2">
                            <input className={ic} placeholder="https://..." maxLength={500} value={typeof newMember.avatar === "string" && newMember.avatar.startsWith("http") ? newMember.avatar : ""} onChange={e => setNewMember(prev => ({ ...prev, avatar: e.target.value }))} />
                            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg text-xs border border-white/10 text-white/50 hover:text-white/80 transition-colors shrink-0 cursor-pointer" onMouseEnter={() => soundEngine.hover()}>Upload</button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                          </div>
                          {newMember.avatar && <img src={newMember.avatar} alt="" className="w-14 h-14 rounded-full object-cover mt-2 border border-purple-500/30" />}
                        </div>
                        <div>
                          <label className={lc}>Kanji Tag</label>
                          <div className="flex flex-wrap gap-1.5">
                            {KANJI_OPTIONS.map(k => <button key={k} onClick={() => setNewMember(prev => ({ ...prev, kanji: k }))} className="w-8 h-8 rounded-lg text-sm font-bold transition-all cursor-pointer" style={{ background: newMember.kanji === k ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)", border: newMember.kanji === k ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.1)", color: newMember.kanji === k ? "#c084fc" : "rgba(255,255,255,0.4)" }}>{k}</button>)}
                          </div>
                        </div>
                        <div>
                          <label className={lc}>Color Preset</label>
                          <div className="flex gap-2 flex-wrap">
                            {COLOR_PRESETS.map((c, ci) => <button key={ci} onClick={() => setNewMember(prev => ({ ...prev, colors: c }))} className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer" style={{ background: `linear-gradient(135deg, ${c[0]}, ${c[1]})`, borderColor: JSON.stringify(newMember.colors) === JSON.stringify(c) ? "white" : "transparent" }} />)}
                          </div>
                        </div>
                      </>)}
                      <div className="flex gap-2 pt-1">
                        <button onClick={addMember} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer active:scale-[0.97] transition-transform" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>Add Member</button>
                        <button onClick={() => { setAddingMember(false); setNewMember(EMPTY_MEMBER()); }} className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 border border-white/10 cursor-pointer transition-colors" onMouseEnter={() => soundEngine.hover()}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>)}

                {tab === "timeline" && (<>
                  {data.timeline.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3"><span className="text-xl">{item.icon}</span><div><p className="text-white/70 text-xs">{item.label}</p><p className="text-white/25 text-[10px] font-mono">{item.date}</p></div></div>
                      <button onClick={() => removeTl(item.id)} className="text-red-400/40 hover:text-red-400/80 text-xs transition-colors cursor-pointer px-2" onMouseEnter={() => soundEngine.hover()}>✕</button>
                    </div>
                  ))}
                  {!addingTimeline ? (
                    <button onClick={() => { soundEngine.click(); setAddingTimeline(true); }} className="w-full py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase border border-dashed border-purple-500/25 text-purple-400/50 hover:border-purple-500/50 hover:text-purple-400/80 transition-all cursor-pointer" onMouseEnter={() => soundEngine.hover()}>+ Add Story Point</button>
                  ) : (
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)" }}>
                      <div><label className={lc}>Date</label><input className={ic} placeholder="e.g. Jul 2026" maxLength={30} value={newTl.date} onChange={e => setNewTl(prev => ({ ...prev, date: e.target.value }))} /></div>
                      <div><label className={lc}>Label</label><input className={ic} placeholder="Event description" maxLength={200} value={newTl.label} onChange={e => setNewTl(prev => ({ ...prev, label: e.target.value }))} /></div>
                      <div><label className={lc}>Icon</label><div className="grid grid-cols-7 gap-1.5">{TIMELINE_ICONS.map(icon => <button key={icon} onClick={() => setNewTl(prev => ({ ...prev, icon }))} className="h-9 rounded-lg text-lg transition-all cursor-pointer" style={{ background: newTl.icon === icon ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)", border: newTl.icon === icon ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.1)" }}>{icon}</button>)}</div></div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={addTimeline} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>Add</button>
                        <button onClick={() => setAddingTimeline(false)} className="px-4 py-2 rounded-xl text-xs text-white/40 border border-white/10 cursor-pointer hover:text-white/70 transition-colors" onMouseEnter={() => soundEngine.hover()}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>)}

                {tab === "news" && (<>
                  <div><label className={lc}>Discord Invite Link</label><input className={ic} value={discordLink} maxLength={200} onChange={e => setDiscordLink(e.target.value)} placeholder="https://discord.gg/..." /></div>
                  <button onClick={saveSettings} className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98]" style={{ background: saved ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #a855f7, #ec4899)", color: "white", border: saved ? "1px solid rgba(16,185,129,0.5)" : "none" }} onMouseEnter={() => soundEngine.hover()}>{saved ? "✓ Saved" : "Save Settings"}</button>
                  <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  {data.news.map(item => (
                    <div key={item.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex justify-between mb-1"><p className="text-white/65 text-xs font-semibold">{item.title}</p><button onClick={() => removeNews(item.id)} className="text-red-400/40 hover:text-red-400/80 text-xs cursor-pointer" onMouseEnter={() => soundEngine.hover()}>✕</button></div>
                      <p className="text-white/25 text-[10px] font-mono">{item.date}</p>
                      <p className="text-white/35 text-[11px] mt-1 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                  {!addingNews ? (
                    <button onClick={() => { soundEngine.click(); setAddingNews(true); }} className="w-full py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase border border-dashed border-purple-500/25 text-purple-400/50 hover:border-purple-500/50 hover:text-purple-400/80 transition-all cursor-pointer" onMouseEnter={() => soundEngine.hover()}>+ Add News</button>
                  ) : (
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)" }}>
                      <div><label className={lc}>Date</label><input className={ic} placeholder="Jun 2026" maxLength={30} value={newNews.date} onChange={e => setNewNews(prev => ({ ...prev, date: e.target.value }))} /></div>
                      <div><label className={lc}>Title</label><input className={ic} placeholder="Headline" maxLength={200} value={newNews.title} onChange={e => setNewNews(prev => ({ ...prev, title: e.target.value }))} /></div>
                      <div><label className={lc}>Body</label><textarea className={ic} rows={3} placeholder="Details..." maxLength={1000} value={newNews.body} onChange={e => setNewNews(prev => ({ ...prev, body: e.target.value }))} /></div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={addNews} className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>Add</button>
                        <button onClick={() => setAddingNews(false)} className="px-4 py-2 rounded-xl text-xs text-white/40 border border-white/10 cursor-pointer hover:text-white/70 transition-colors" onMouseEnter={() => soundEngine.hover()}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>)}

                {tab === "security" && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-purple-300/70 tracking-widest uppercase mb-3">Admin Accounts</p>
                      {accounts.map(acc => (
                        <div key={acc.username} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div><p className="text-white/70 text-xs font-semibold">{acc.username}</p>{acc.isSuperAdmin && <p className="text-purple-400/50 text-[10px] font-mono">Super Admin</p>}</div>
                          {acc.username !== currentUser && <button onClick={() => handleRemoveAccount(acc.username)} className="text-red-400/40 hover:text-red-400/80 text-xs cursor-pointer px-2 transition-colors" onMouseEnter={() => soundEngine.hover()}>Remove</button>}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <p className="text-[10px] font-bold text-purple-300/60 tracking-widest uppercase">Create New Admin</p>
                      <div><label className={lc}>Username</label><input className={ic} placeholder="newadmin" maxLength={40} value={newAccUser} onChange={e => setNewAccUser(e.target.value)} /></div>
                      <div><label className={lc}>Password</label><input className={ic} type="password" placeholder="Min 8 characters" maxLength={200} value={newAccPass} onChange={e => setNewAccPass(e.target.value)} /></div>
                      {newAccMsg.err && <p className="text-red-400/80 text-xs font-mono">{newAccMsg.err}</p>}
                      {newAccMsg.ok && <p className="text-emerald-400/80 text-xs font-mono">{newAccMsg.ok}</p>}
                      <button onClick={handleCreateAccount} className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>Create Account</button>
                    </div>
                    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.15)" }}>
                      <p className="text-[10px] font-bold text-pink-300/60 tracking-widest uppercase">Change Password</p>
                      <div><label className={lc}>Account</label><select className={ic} value={changePwUser} onChange={e => setChangePwUser(e.target.value)} style={{ appearance: "none" }}><option value="">Select account…</option>{accounts.map(a => <option key={a.username} value={a.username}>{a.username}</option>)}</select></div>
                      <div><label className={lc}>New Password</label><input className={ic} type="password" placeholder="Min 8 characters" maxLength={200} value={changePwNew} onChange={e => setChangePwNew(e.target.value)} /></div>
                      {changePwMsg.err && <p className="text-red-400/80 text-xs font-mono">{changePwMsg.err}</p>}
                      {changePwMsg.ok && <p className="text-emerald-400/80 text-xs font-mono">{changePwMsg.ok}</p>}
                      <button onClick={handleChangePassword} className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "white" }} onMouseEnter={() => soundEngine.hover()}>Update Password</button>
                    </div>
                  </div>
                )}

                {tab === "site" && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold text-purple-300/70 tracking-widest uppercase mb-1">Maintenance Mode</p>
                      <p className="text-[11px] text-white/30 mb-4">When enabled, visitors see the maintenance page. The admin button is always accessible.</p>

                      <button
                        onClick={() => { soundEngine.click(); setMaintEnabled(v => !v); }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 cursor-pointer"
                        style={{
                          background: maintEnabled ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.03)",
                          border: maintEnabled ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          boxShadow: maintEnabled ? "0 0 28px rgba(168,85,247,0.12)" : "none",
                        }}
                        onMouseEnter={() => soundEngine.hover()}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: maintEnabled ? "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))" : "rgba(255,255,255,0.05)", border: maintEnabled ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.1)" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={maintEnabled ? "rgba(196,132,252,0.9)" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold" style={{ color: maintEnabled ? "rgba(196,132,252,0.9)" : "rgba(255,255,255,0.5)" }}>
                              {maintEnabled ? "Maintenance Active" : "Site Live"}
                            </p>
                            <p className="text-[10px] font-mono" style={{ color: maintEnabled ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.2)" }}>
                              {maintEnabled ? "Visitors see maintenance page" : "Site is publicly accessible"}
                            </p>
                          </div>
                        </div>
                        <div className="relative w-11 h-6 rounded-full transition-all duration-300 shrink-0" style={{ background: maintEnabled ? "linear-gradient(135deg, #a855f7, #ec4899)" : "rgba(255,255,255,0.1)" }}>
                          <motion.div
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                            animate={{ x: maintEnabled ? 22 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 32 }}
                          />
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3" style={{ opacity: 1 }}>
                      <div>
                        <label className={lc}>Custom Message</label>
                        <textarea
                          className={ic}
                          rows={3}
                          placeholder="We're performing scheduled maintenance to improve your experience…"
                          maxLength={500}
                          value={maintMessage}
                          onChange={e => setMaintMessage(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={lc}>Expected ETA</label>
                        <input
                          className={ic}
                          placeholder="e.g. Tonight at 10 PM or July 4, 2026"
                          maxLength={100}
                          value={maintEta}
                          onChange={e => setMaintEta(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveMaintenance}
                      disabled={maintSaving}
                      className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wider cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
                      style={{
                        background: maintSaved ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #a855f7, #ec4899)",
                        color: "white",
                        border: maintSaved ? "1px solid rgba(16,185,129,0.5)" : "none",
                      }}
                      onMouseEnter={() => soundEngine.hover()}
                    >
                      {maintSaving ? "Saving…" : maintSaved ? "✓ Saved" : "Save Maintenance Settings"}
                    </button>

                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,165,0,0.04)", border: "1px solid rgba(255,165,0,0.12)" }}>
                      <p className="text-[10px] font-mono text-amber-400/45 leading-relaxed">
                        The Admin button remains visible above the maintenance page so you can toggle it off. Changes apply immediately to all visitors.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
