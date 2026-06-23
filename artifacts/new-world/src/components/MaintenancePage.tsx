import { motion } from "framer-motion";

type Props = { message?: string; eta?: string };

export default function MaintenancePage({ message, eta }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "#04020e" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(88,28,135,0.22) 0%, transparent 60%)" }} />

      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: 320 + i * 160, height: 320 + i * 160, border: `1px solid rgba(168,85,247,${0.08 - i * 0.03})` }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 20 + i * 8, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(16,7,36,0.98), rgba(6,3,18,0.99))",
          border: "1px solid rgba(168,85,247,0.22)",
          boxShadow: "0 0 80px rgba(168,85,247,0.1), 0 32px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(236,72,153,0.5), transparent)" }} />

        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.12))",
                border: "1px solid rgba(168,85,247,0.35)",
                boxShadow: "0 0 32px rgba(168,85,247,0.15)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(196,132,252,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </motion.div>

            <motion.p
              className="text-[9px] font-mono tracking-[0.55em] uppercase mb-2"
              style={{ color: "rgba(168,85,247,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              System Status
            </motion.p>

            <motion.h1
              className="font-black tracking-tight leading-none mb-3"
              style={{
                fontSize: "1.9rem",
                background: "linear-gradient(135deg, #ffffff 0%, #c084fc 55%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Under Maintenance
            </motion.h1>

            <motion.p
              className="text-sm leading-relaxed mb-5"
              style={{ color: "rgba(255,255,255,0.32)", maxWidth: "22rem" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {message || "Performing scheduled improvements. Back shortly."}
            </motion.p>

            {eta && (
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <span className="text-[11px] font-mono text-emerald-400/80">ETA: {eta}</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="px-8 pb-7">
          <div className="h-px w-full mb-5" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-semibold" style={{ color: "rgba(196,132,252,0.7)" }}>NEW WORLD</p>
              <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>Grand Line Division</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>@paxjest</p>
              <a
                href="mailto:antixss@outlook.com"
                className="text-[9px] font-mono transition-colors"
                style={{ color: "rgba(168,85,247,0.45)" }}
              >
                antixss@outlook.com
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
