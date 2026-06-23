import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { soundEngine } from "@/lib/sound";

const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_KEY = "nw_anime_cache_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000;

type AnimeMedia = {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; color: string | null };
  genres: string[];
  episodes: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null };
  description: string | null;
  averageScore: number | null;
  format: string | null;
};

const UPCOMING_QUERY = `query($page:Int){Page(page:$page,perPage:12){media(type:ANIME,status:NOT_YET_RELEASED,sort:POPULARITY_DESC){id title{romaji english}coverImage{large color}genres episodes status season seasonYear startDate{year month}description(asHtml:false)averageScore format}}}`;
const SEARCH_QUERY = `query($search:String!,$page:Int){Page(page:$page,perPage:12){media(type:ANIME,search:$search,sort:POPULARITY_DESC){id title{romaji english}coverImage{large color}genres episodes status season seasonYear startDate{year month}description(asHtml:false)averageScore format}}}`;

type CacheEntry = { data: AnimeMedia[]; timestamp: number };

function getCache(): AnimeMedia[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCache(data: AnimeMedia[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
}

async function anilistFetch(query: string, variables: object): Promise<AnimeMedia[]> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("Request failed");
  const json = await res.json();
  return json?.data?.Page?.media ?? [];
}

function AnimeCard({ anime, index }: { anime: AnimeMedia; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [expanded, setExpanded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const accent = anime.coverImage.color || "#a855f7";
  const statusLabel: Record<string, string> = { NOT_YET_RELEASED: "Upcoming", RELEASING: "Airing", FINISHED: "Finished", CANCELLED: "Cancelled", HIATUS: "Hiatus" };
  const statusColor: Record<string, string> = { NOT_YET_RELEASED: "#a855f7", RELEASING: "#10b981", FINISHED: "#6366f1", CANCELLED: "#ef4444", HIATUS: "#f59e0b" };
  const title = anime.title.english || anime.title.romaji;
  const desc = anime.description?.replace(/<[^>]+>/g, "").slice(0, 160) || "";
  const dateStr = anime.startDate.year
    ? `${anime.startDate.month ? new Date(2024, anime.startDate.month - 1).toLocaleString("en", { month: "short" }) + " " : ""}${anime.startDate.year}`
    : (anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : "TBA");

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 6) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{ transform: `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, transition: "transform 0.25s ease, box-shadow 0.3s ease", boxShadow: "0 4px 28px rgba(0,0,0,0.45)" }}
      onMouseMove={e => { const r = ref.current?.getBoundingClientRect(); if (!r) return; setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 14, y: ((e.clientY - r.top) / r.height - 0.5) * -14 }); }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={() => { setExpanded(e => !e); soundEngine.click(); }}
      onMouseEnter={() => soundEngine.hover()}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img src={anime.coverImage.large} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(4,2,14,0.97) 0%, rgba(4,2,14,0.45) 40%, transparent 70%)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}12 0%, transparent 50%)` }} />
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start gap-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase" style={{ background: `${statusColor[anime.status] || "#a855f7"}22`, border: `1px solid ${statusColor[anime.status] || "#a855f7"}55`, color: statusColor[anime.status] || "#a855f7" }}>{statusLabel[anime.status] || anime.status}</span>
          {anime.averageScore && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "#fbbf24" }}>★ {(anime.averageScore / 10).toFixed(1)}</span>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <p className="text-white font-bold text-sm leading-snug mb-1.5 line-clamp-2">{title}</p>
          <div className="flex flex-wrap gap-1 mb-1.5">{anime.genres.slice(0, 2).map(g => <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${accent}20`, color: accent }}>{g}</span>)}</div>
          <div className="flex items-center gap-2.5 text-[10px] text-white/35 font-mono"><span>{dateStr}</span>{anime.episodes && <span>{anime.episodes} eps</span>}</div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" style={{ background: "rgba(8,4,20,0.98)", borderTop: `1px solid ${accent}22` }}>
            <p className="p-4 text-white/45 text-xs leading-relaxed">{desc || "No description available."}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AnimeSection() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"top" | "search">("top");
  const [error, setError] = useState("");
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-100px" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 420);
    return () => clearTimeout(t);
  }, [query]);

  const fetchData = useCallback(async (q: string) => {
    setLoading(true); setError("");
    try {
      if (q) {
        setResults(await anilistFetch(SEARCH_QUERY, { search: q, page: 1 }));
        setMode("search");
      } else {
        const cached = getCache();
        if (cached) { setResults(cached); setMode("top"); setLoading(false); return; }
        const data = await anilistFetch(UPCOMING_QUERY, { page: 1 });
        setCache(data); setResults(data); setMode("top");
      }
    } catch { setError("Could not load content. Check your connection."); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(debouncedQuery); }, [debouncedQuery, fetchData]);

  return (
    <section id="anime" className="py-20 md:py-32 px-4 sm:px-6 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 30%, rgba(59,130,246,0.05) 0%, transparent 60%)" }} />
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="mb-10 md:mb-14">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={headerInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-xs font-mono tracking-[0.5em] uppercase text-blue-400/45 mb-3">Top Picks</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={headerInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.08 }} className="text-4xl sm:text-5xl font-black tracking-tight text-white/90 mb-6">Anime</motion.h2>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={headerInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.16 }} className="max-w-xl">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref={inputRef} type="text" placeholder="Search anime..." value={query} onChange={e => { setQuery(e.target.value); soundEngine.hover(); }} maxLength={100} className="flex-1 bg-transparent text-white/80 placeholder-white/20 text-sm outline-none" />
              {query && <button onClick={() => { setQuery(""); inputRef.current?.focus(); soundEngine.click(); }} className="text-white/25 hover:text-white/55 cursor-pointer transition-colors text-lg leading-none">✕</button>}
            </div>
            <p className="mt-2.5 text-[10px] font-mono text-white/20 tracking-wider">
              {mode === "top" ? "Auto-refreshed daily · Top upcoming releases" : `Results for "${debouncedQuery}"`}
              {!loading && results.length > 0 && ` · ${results.length} titles`}
            </p>
          </motion.div>
        </div>

        {error && (
          <div className="text-center py-16 text-white/25 text-sm">
            <p className="text-3xl mb-3">⚠️</p><p>{error}</p>
            <button onClick={() => fetchData(debouncedQuery)} className="mt-4 px-4 py-2 rounded-xl text-xs border border-white/10 text-white/35 hover:text-white/65 cursor-pointer transition-colors">Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-2xl overflow-hidden aspect-[3/4] animate-pulse" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.07), rgba(236,72,153,0.05))" }} />)}
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {results.map((anime, i) => <AnimeCard key={anime.id} anime={anime} index={i} />)}
          </div>
        )}

        {!loading && !error && results.length === 0 && debouncedQuery && (
          <div className="text-center py-20 text-white/20"><p className="text-4xl mb-4">🔮</p><p className="text-sm">No results for "{debouncedQuery}"</p></div>
        )}
      </div>
    </section>
  );
}
