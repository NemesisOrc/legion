import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const called = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!called.current) { called.current = true; onComplete(); }
    }, 1500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#04020e" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(88,28,135,0.22) 0%, transparent 65%)" }} />

      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ width: 120 + i * 80, height: 120 + i * 80, borderColor: `rgba(168,85,247,${0.18 - i * 0.05})` }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.04, 1] }}
          transition={{
            rotate: { duration: 8 + i * 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 2.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}

      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.div
            key={`p${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{ background: i % 2 === 0 ? "#a855f7" : "#ec4899", x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.4, 0.6] }}
            transition={{ duration: 1.8, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}

      <div className="relative z-10 flex flex-col items-center gap-3">
        <motion.p
          className="text-[10px] font-mono tracking-[0.6em] uppercase"
          style={{ color: "rgba(168,85,247,0.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5] }}
          transition={{ duration: 1.2 }}
        >
          Grand Line Division
        </motion.p>

        <motion.h1
          className="font-black tracking-[-0.02em] leading-none"
          style={{
            fontSize: "clamp(2.8rem, 10vw, 5rem)",
            background: "linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          NEW WORLD
        </motion.h1>

        <motion.div
          className="mt-4 h-px rounded-full overflow-hidden"
          style={{ width: 160, background: "rgba(168,85,247,0.15)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
