import { useState, useCallback, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import BubbleCanvas from "@/components/BubbleCanvas";
import AdminPanel from "@/components/AdminPanel";
import AnimeSection from "@/components/AnimeSection";
import Preloader from "@/components/Preloader";
import { loadData, loadDataSync, type SiteData, type Member, type TimelineItem, type NewsItem } from "@/lib/store";
import { soundEngine } from "@/lib/sound";

type DiscordPresence = { members: number; online: number } | null;

function useDiscordPresence(inviteCode: string) {
  const [presence, setPresence] = useState<DiscordPresence>(null);
  useEffect(() => {
    if (!inviteCode) return;
    const code = inviteCode.split("/").pop() || inviteCode;
    let cancelled = false;
    const fetch_ = async () => {
      try {
        const res = await fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true`, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setPresence({ members: json.approximate_member_count ?? 0, online: json.approximate_presence_count ?? 0 });
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [inviteCode]);
  return presence;
}

const NAV_ITEMS = [{ label: "Crew", id: "crew" }, { label: "Story", id: "story" }, { label: "News", id: "news" }, { label: "Anime", id: "anime" }];

function NavBar({ discordInvite, presence }: { discordInvite: string; presence: DiscordPresence }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollTo = (id: string) => { soundEngine.click(); setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 transition-all duration-500"
        style={{ background: scrolled ? "rgba(4,2,14,0.88)" : "transparent", backdropFilter: scrolled ? "blur(24px)" : "none", borderBottom: scrolled ? "1px solid rgba(168,85,247,0.1)" : "1px solid transparent", paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <button onClick={() => scrollTo("hero")} className="text-base sm:text-lg font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase cursor-pointer shrink-0" style={{ background: "linear-gradient(135deg, #c084fc, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} onMouseEnter={() => soundEngine.hover()}>NEW WORLD</button>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_ITEMS.map(({ label, id }) => <button key={id} onClick={() => scrollTo(id)} className="text-xs font-bold tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors cursor-pointer" onMouseEnter={() => soundEngine.hover()}>{label}</button>)}
          </div>
          <div className="flex items-center gap-2">
            {presence && <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400/80">{presence.online.toLocaleString()} online</span></div>}
            <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all duration-300 shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))", border: "1px solid rgba(168,85,247,0.35)", color: "rgba(196,132,252,0.9)" }}
              onMouseEnter={e => { soundEngine.hover(); (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(168,85,247,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
              onClick={() => soundEngine.click()}>
              <svg width="13" height="10" viewBox="0 0 24 18" fill="currentColor"><path d="M20.317 1.492A19.823 19.823 0 0 0 15.885.157a.074.074 0 0 0-.079.037c-.34.6-.719 1.384-.984 2.001a18.302 18.302 0 0 0-5.487 0 12.64 12.64 0 0 0-.995-2.001.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 5.835-.32 10.028.099 14.166a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.647a.061.061 0 0 0-.031-.03z" /></svg>
              <span className="hidden xs:inline">Discord</span>
            </a>
            <button className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-xl transition-colors"
              style={{ background: menuOpen ? "rgba(168,85,247,0.15)" : "transparent", border: "1px solid rgba(168,85,247,0.2)" }}
              onClick={() => { setMenuOpen(m => !m); soundEngine.click(); }}>
              <span className="w-4 h-px bg-white/60 transition-transform duration-200" style={{ transform: menuOpen ? "rotate(45deg) translate(2px,2px)" : "" }} />
              <span className="w-4 h-px bg-white/60 transition-opacity duration-200" style={{ opacity: menuOpen ? 0 : 1 }} />
              <span className="w-4 h-px bg-white/60 transition-transform duration-200" style={{ transform: menuOpen ? "rotate(-45deg) translate(2px,-2px)" : "" }} />
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[38] flex flex-col pt-20 pb-6 px-5 gap-1 md:hidden"
            style={{ background: "rgba(4,2,14,0.96)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(168,85,247,0.12)" }}>
            {NAV_ITEMS.map(({ label, id }) => <button key={id} onClick={() => scrollTo(id)} className="text-left py-3.5 text-base font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors cursor-pointer border-b border-white/[0.05]">{label}</button>)}
            {presence && <div className="flex items-center gap-2 pt-3 text-xs font-mono text-emerald-400/70"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{presence.online.toLocaleString()} online · {presence.members.toLocaleString()} members</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HeroSection({ onPop, discordInvite, presence }: { onPop: () => void; discordInvite: string; presence: DiscordPresence }) {
  return (
    <section id="hero" className="relative flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: "100dvh" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(88,28,135,0.28) 0%, rgba(4,2,14,0) 65%)" }} />
      <BubbleCanvas onPop={onPop} />
      <div className="relative z-10 text-center px-5 sm:px-8 pointer-events-none select-none max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}>
          <motion.p initial={{ opacity: 0, letterSpacing: "0.3em" }} animate={{ opacity: 1, letterSpacing: "0.5em" }} transition={{ duration: 1.1 }} className="text-[10px] sm:text-xs font-mono uppercase text-purple-400/60 mb-5 sm:mb-7">Grand Line Division</motion.p>
          <h1 className="font-black tracking-[-0.02em] leading-[0.9] mb-6 sm:mb-8" style={{ fontSize: "clamp(3.2rem, 13vw, 7.5rem)", background: "linear-gradient(135deg, #ffffff 0%, #c084fc 45%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NEW WORLD</h1>
          <p className="text-white/40 font-light tracking-wide leading-relaxed mx-auto" style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.15rem)", maxWidth: "32rem" }}>Join the world. Create the story. Leave your mark.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.7 }} className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
          <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm tracking-wider uppercase transition-all duration-300 w-full sm:w-auto justify-center"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white", boxShadow: "0 0 40px rgba(168,85,247,0.35)" }}
            onMouseEnter={e => { soundEngine.hover(); (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 60px rgba(168,85,247,0.55)"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(168,85,247,0.35)"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
            onClick={() => soundEngine.click()}>
            <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor"><path d="M20.317 1.492A19.823 19.823 0 0 0 15.885.157a.074.074 0 0 0-.079.037c-.34.6-.719 1.384-.984 2.001a18.302 18.302 0 0 0-5.487 0 12.64 12.64 0 0 0-.995-2.001.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 5.835-.32 10.028.099 14.166a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.647a.061.061 0 0 0-.031-.03z" /></svg>
            Join on Discord
          </a>
          {presence && <div className="flex items-center gap-2 px-4 py-3 rounded-full text-xs font-mono" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-300/80">{presence.online.toLocaleString()} online · {presence.members.toLocaleString()} members</span></div>}
        </motion.div>
      </div>
      <motion.div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 0.8 }}>
        <span className="text-white/15 text-[9px] tracking-[0.4em] uppercase font-mono">Scroll</span>
        <motion.div className="w-px h-8 sm:h-10 bg-gradient-to-b from-purple-500/40 to-transparent" animate={{ scaleY: [1, 0.5, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
      </motion.div>
    </section>
  );
}

function MemberCard({ member, index }: { member: Member; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState(false);
  if (member.isAwaiting) {
    return (
      <motion.div ref={ref} initial={{ opacity: 0, scale: 0.92 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.6, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl flex flex-col items-center justify-center gap-3" style={{ minHeight: 260, background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(168,85,247,0.18)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white/10" style={{ border: "1px dashed rgba(168,85,247,0.15)" }}>?</div>
        <p className="text-white/15 text-[10px] font-mono tracking-[0.3em] uppercase">Awaiting</p>
      </motion.div>
    );
  }
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 48, rotateX: 8 }} animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}} transition={{ duration: 0.7, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-default"
      style={{ transform: `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, transition: "transform 0.3s ease, box-shadow 0.4s ease", background: "linear-gradient(155deg, rgba(18,8,38,0.96), rgba(6,3,18,0.98))", border: `1px solid ${glow ? member.colors[0] + "40" : "rgba(255,255,255,0.07)"}`, boxShadow: glow ? `0 8px 48px ${member.colors[0]}20, 0 0 0 1px ${member.colors[0]}15` : "0 4px 24px rgba(0,0,0,0.4)" }}
      onMouseMove={e => { const r = ref.current?.getBoundingClientRect(); if (!r) return; setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 18, y: ((e.clientY - r.top) / r.height - 0.5) * -18 }); }}
      onMouseEnter={() => { setGlow(true); soundEngine.hover(); }}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setGlow(false); }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(105deg, transparent 40%, ${member.colors[0]}0e 50%, transparent 60%)`, backgroundSize: "200% 100%", animation: glow ? "shimmer 2.5s linear infinite" : "none", opacity: glow ? 1 : 0, transition: "opacity 0.4s" }} />
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-500" style={{ background: `linear-gradient(145deg, ${member.colors[0]}0a, ${member.colors[1]}06)`, opacity: glow ? 1 : 0 }} />
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${member.colors[0]}, ${member.colors[1]}, transparent)`, opacity: glow ? 1 : 0, transition: "opacity 0.4s" }} />
      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative shrink-0">
            {member.avatar ? (
              <div className="relative">
                <img src={member.avatar} alt={member.handle} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover" style={{ border: `2px solid ${member.colors[0]}55` }} />
                <div className="absolute inset-0 rounded-full" style={{ boxShadow: glow ? `0 0 20px ${member.colors[0]}50` : "none", transition: "box-shadow 0.4s" }} />
              </div>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl font-black" style={{ background: `linear-gradient(135deg, ${member.colors[0]}25, ${member.colors[1]}18)`, border: `2px solid ${member.colors[0]}40` }}>{member.handle.charAt(1) || "?"}</div>
            )}
            <motion.div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center font-black"
              animate={glow ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.5 }}
              style={{ background: `linear-gradient(135deg, ${member.colors[0]}, ${member.colors[1]})`, color: "white", fontSize: "10px", boxShadow: glow ? `0 0 12px ${member.colors[0]}60` : "none" }}>
              {member.kanji}
            </motion.div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm sm:text-base tracking-wide truncate mb-0.5" style={{ color: member.colors[0] }}>{member.handle}</p>
            <p className="text-white/40 text-xs font-mono">{member.role}</p>
            {member.name && <p className="text-white/20 text-[10px] mt-0.5">{member.name}</p>}
          </div>
        </div>
        {member.quote && <div className="mb-5 pl-3" style={{ borderLeft: `2px solid ${member.colors[0]}30` }}><p className="text-white/45 text-[13px] leading-relaxed italic line-clamp-2">"{member.quote}"</p></div>}
        {member.traits.some(Boolean) && (
          <div className="flex flex-wrap gap-1.5">
            {member.traits.filter(Boolean).map((trait, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: index * 0.09 + 0.3 + i * 0.05 }}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{ background: `${member.colors[0]}14`, border: `1px solid ${member.colors[0]}28`, color: `${member.colors[0]}cc` }}>{trait}</motion.span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CrewSection({ members }: { members: Member[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="crew" className="py-20 md:py-32 px-4 sm:px-6 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 50%, rgba(88,28,135,0.09) 0%, transparent 60%)" }} />
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="mb-10 md:mb-16">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-xs font-mono tracking-[0.5em] uppercase text-purple-400/50 mb-3">The Vanguard</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08 }} className="text-4xl sm:text-5xl font-black tracking-tight text-white/90">Meet the Crew</motion.h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {members.map((member, i) => <MemberCard key={member.id} member={member} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function TimelineRow({ item, index }: { item: TimelineItem; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -32 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.65, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }} className="flex gap-5 sm:gap-6" onMouseEnter={() => soundEngine.hover()}>
      <div className="relative shrink-0">
        <motion.div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-base sm:text-lg" whileHover={{ scale: 1.12, rotate: [0, -8, 8, 0] }} transition={{ duration: 0.4 }}
          style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.65), rgba(131,24,67,0.45))", border: "1px solid rgba(168,85,247,0.35)", boxShadow: "0 0 20px rgba(168,85,247,0.12)" }}>{item.icon}</motion.div>
      </div>
      <div className="pt-1.5">
        <p className="text-[10px] font-mono tracking-widest uppercase text-purple-400/50 mb-1">{item.date}</p>
        <p className="text-white/70 text-sm leading-relaxed">{item.label}</p>
      </div>
    </motion.div>
  );
}

function TimelineSection({ items }: { items: TimelineItem[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="story" className="py-20 md:py-32 px-4 sm:px-6 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 75% 50%, rgba(219,39,119,0.06) 0%, transparent 60%)" }} />
      <div className="max-w-3xl mx-auto">
        <div ref={ref} className="mb-10 md:mb-16">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-xs font-mono tracking-[0.5em] uppercase text-purple-400/50 mb-3">Our Journey</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08 }} className="text-4xl sm:text-5xl font-black tracking-tight text-white/90">The Story So Far</motion.h2>
        </div>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, rgba(168,85,247,0.45), rgba(236,72,153,0.15), transparent)" }} />
          <div className="space-y-8 sm:space-y-10">{items.map((item, i) => <TimelineRow key={item.id} item={item} index={i} />)}</div>
        </div>
      </div>
    </section>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="p-5 sm:p-6 rounded-2xl transition-all duration-300" style={{ background: "linear-gradient(155deg, rgba(18,8,38,0.7), rgba(6,3,18,0.82))", border: "1px solid rgba(168,85,247,0.1)" }}
      onMouseEnter={() => soundEngine.hover()}
      whileHover={{ borderColor: "rgba(168,85,247,0.22)", y: -2 } as never}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-white/85 font-bold text-sm sm:text-base leading-snug">{item.title}</h3>
        {item.date && <span className="text-[10px] font-mono text-white/25 tracking-widest shrink-0 mt-0.5 whitespace-nowrap">{item.date}</span>}
      </div>
      {item.body && <p className="text-white/40 text-sm leading-relaxed">{item.body}</p>}
    </motion.div>
  );
}

function NewsSection({ items, discordInvite, presence }: { items: NewsItem[]; discordInvite: string; presence: DiscordPresence }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="news" className="py-20 md:py-32 px-4 sm:px-6 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(88,28,135,0.1) 0%, transparent 55%)" }} />
      <div className="max-w-4xl mx-auto">
        <div ref={ref} className="mb-10 md:mb-14">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-xs font-mono tracking-[0.5em] uppercase text-purple-400/50 mb-3">Latest</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08 }} className="text-4xl sm:text-5xl font-black tracking-tight text-white/90">News & Updates</motion.h2>
        </div>
        <div className="space-y-4 mb-16 sm:mb-20">{items.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center py-14 sm:py-20 rounded-3xl relative overflow-hidden"
          style={{ background: "linear-gradient(155deg, rgba(88,28,135,0.15), rgba(131,24,67,0.1))", border: "1px solid rgba(168,85,247,0.16)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.14) 0%, transparent 60%)" }} />
          <div className="relative z-10 px-5">
            <p className="text-xs font-mono tracking-[0.5em] uppercase text-purple-400/50 mb-4">Join the Fleet</p>
            <h3 className="text-3xl sm:text-4xl font-black text-white/90 mb-4">Ready to set sail?</h3>
            {presence && (
              <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-300/80">{presence.online.toLocaleString()} online now</span></div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}><span className="text-purple-300/80">{presence.members.toLocaleString()} members</span></div>
              </div>
            )}
            <p className="text-white/30 text-sm mb-10 max-w-sm mx-auto leading-relaxed">The New World awaits. Join our Discord and find your place in the crew.</p>
            <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white", boxShadow: "0 0 40px rgba(168,85,247,0.3)" }}
              onMouseEnter={e => { soundEngine.hover(); (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 60px rgba(168,85,247,0.5)"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(168,85,247,0.3)"; (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
              onClick={() => soundEngine.click()}>
              <svg width="16" height="13" viewBox="0 0 24 18" fill="currentColor"><path d="M20.317 1.492A19.823 19.823 0 0 0 15.885.157a.074.074 0 0 0-.079.037c-.34.6-.719 1.384-.984 2.001a18.302 18.302 0 0 0-5.487 0 12.64 12.64 0 0 0-.995-2.001.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 5.835-.32 10.028.099 14.166a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.647a.061.061 0 0 0-.031-.03z" /></svg>
              Join on Discord
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer({ discordInvite }: { discordInvite: string }) {
  return (
    <footer className="px-4 sm:px-6 border-t border-white/[0.04]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-black tracking-[0.3em] uppercase" style={{ background: "linear-gradient(135deg, #c084fc, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NEW WORLD</p>
          <div className="flex items-center gap-4 sm:gap-6">
            {[{ label: "Crew", id: "crew" }, { label: "Story", id: "story" }, { label: "Anime", id: "anime" }].map(({ label, id }) => (
              <button key={id} onClick={() => { soundEngine.click(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} className="text-[10px] font-mono tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors cursor-pointer" onMouseEnter={() => soundEngine.hover()}>{label}</button>
            ))}
            <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono tracking-widest uppercase text-white/20 hover:text-purple-400/70 transition-colors" onMouseEnter={() => soundEngine.hover()}>Discord</a>
          </div>
          <p className="text-white/10 text-[10px] font-mono">© {new Date().getFullYear()} New World</p>
        </div>
        <div className="py-5 border-t border-white/[0.04] flex flex-col items-center gap-3">
          <p className="text-[9px] font-mono tracking-[0.55em] uppercase text-white/12">Crafted by</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5))" }} />
              <span className="text-sm font-black tracking-[0.2em] uppercase" style={{ background: "linear-gradient(135deg, #c084fc 0%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 8px rgba(168,85,247,0.35))" }}>@Paxjest</span>
              <div className="w-5 h-px" style={{ background: "linear-gradient(90deg, rgba(236,72,153,0.5), transparent)" }} />
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <a href="mailto:antixss@outlook.com" className="group flex items-center gap-1.5 text-[11px] font-mono text-white/20 hover:text-purple-400/60 transition-all duration-300">
              <svg className="opacity-40 group-hover:opacity-80 transition-opacity" width="11" height="9" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="16" rx="2"/><path d="m2 5 10 7 10-7"/></svg>
              antixss@outlook.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [data, setData] = useState<SiteData>(loadDataSync);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const presence = useDiscordPresence(data.discordInvite);

  const handleRefresh = useCallback(async () => {
    const fresh = await loadData();
    setData(fresh);
  }, []);

  const handlePop = useCallback(() => {
    soundEngine.start();
    soundEngine.bubblePop(Math.random());
  }, []);

  useEffect(() => {
    loadData().then(fresh => setData(fresh));
    const start = () => soundEngine.start();
    window.addEventListener("pointerdown", start, { once: true, passive: true });
    window.addEventListener("keydown", start, { once: true, passive: true });
    window.addEventListener("scroll", start, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("scroll", start);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#04020e", color: "#fff" }}>
      <AnimatePresence>
        {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}
      </AnimatePresence>
      <NavBar discordInvite={data.discordInvite} presence={presence} />
      <HeroSection onPop={handlePop} discordInvite={data.discordInvite} presence={presence} />
      <CrewSection members={data.members} />
      <TimelineSection items={data.timeline} />
      <NewsSection items={data.news} discordInvite={data.discordInvite} presence={presence} />
      <AnimeSection />
      <Footer discordInvite={data.discordInvite} />
      <AdminPanel onRefresh={handleRefresh} />
    </div>
  );
}
