import { useEffect, useRef, useCallback } from "react";

const PALETTES: [string, string][] = [
  ["rgba(168,85,247,",  "rgba(139,92,246,"],
  ["rgba(236,72,153,",  "rgba(219,39,119,"],
  ["rgba(59,130,246,",  "rgba(37,99,235,"],
  ["rgba(16,185,129,",  "rgba(5,150,105,"],
  ["rgba(251,191,36,",  "rgba(245,158,11,"],
  ["rgba(239,68,68,",   "rgba(220,38,38,"],
];

type Bubble = {
  x: number; y: number; vx: number; vy: number;
  ax: number; ay: number;
  r: number; wobble: number; wobbleSpd: number;
  px: string; sx: string;
  hovered: boolean; squish: number;
};

type PopRing = {
  x: number; y: number; progress: number;
  px: string; baseR: number;
  particles: { x: number; y: number; vx: number; vy: number; r: number; life: number; px: string }[];
};

function makeBubble(W: number, H: number): Bubble {
  const [px, sx] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  return {
    x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120),
    vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
    ax: 0, ay: 0,
    r: 20 + Math.random() * 58,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpd: 0.007 + Math.random() * 0.012,
    px, sx, hovered: false, squish: 0,
  };
}

export default function BubbleCanvas({ onPop }: { onPop: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animId = useRef(0);
  const bubbles = useRef<Bubble[]>([]);
  const pops = useRef<PopRing[]>([]);
  const handlePop = useCallback(onPop, [onPop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (bubbles.current.length === 0) {
        bubbles.current = Array.from({ length: 20 }, () => makeBubble(canvas.width, canvas.height));
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const src = "touches" in e ? e.touches[0] : e;
      mouse.current = { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      let hit = false;
      bubbles.current = bubbles.current.filter(b => {
        const dx = b.x - cx, dy = b.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < b.r + 4 && !hit) {
          hit = true;
          const particles = Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.5;
            const spd = 2.5 + Math.random() * 4.5;
            return { x: b.x, y: b.y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, r: 2 + Math.random() * 3.5, life: 1, px: b.px };
          });
          pops.current.push({ x: b.x, y: b.y, progress: 0, px: b.px, baseR: b.r, particles });
          setTimeout(() => { bubbles.current.push(makeBubble(canvas.width, canvas.height)); }, 800);
          handlePop();
          return false;
        }
        return true;
      });
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("click", onClick);

    const drawBubble = (b: Bubble) => {
      const wobR = b.r * (1 + Math.sin(b.wobble) * 0.042);
      const glowAlpha = b.hovered ? 0.38 : 0;

      if (b.hovered) {
        const aura = ctx.createRadialGradient(b.x, b.y, wobR * 0.6, b.x, b.y, wobR * 2);
        aura.addColorStop(0, `${b.px}0.28)`);
        aura.addColorStop(1, `${b.px}0.0)`);
        ctx.beginPath(); ctx.arc(b.x, b.y, wobR * 2, 0, Math.PI * 2);
        ctx.fillStyle = aura; ctx.fill();
      }

      if (b.squish > 0) {
        ctx.save(); ctx.translate(b.x, b.y);
        ctx.scale(1 + b.squish * 0.14, 1 / (1 + b.squish * 0.14));
        ctx.translate(-b.x, -b.y);
      }

      const body = ctx.createRadialGradient(b.x - wobR * 0.26, b.y - wobR * 0.3, wobR * 0.04, b.x, b.y, wobR);
      body.addColorStop(0, `${b.sx}${0.2 + glowAlpha * 0.25})`);
      body.addColorStop(0.55, `${b.px}${0.08 + glowAlpha * 0.1})`);
      body.addColorStop(1, `${b.px}${0.26 + glowAlpha * 0.18})`);
      ctx.beginPath(); ctx.arc(b.x, b.y, wobR, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill();

      const rim = ctx.createRadialGradient(b.x, b.y, wobR * 0.74, b.x, b.y, wobR);
      rim.addColorStop(0, `${b.px}0.0)`);
      rim.addColorStop(0.72, `${b.px}0.0)`);
      rim.addColorStop(1, `${b.sx}${0.4 + glowAlpha * 0.2})`);
      ctx.beginPath(); ctx.arc(b.x, b.y, wobR, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      const shine = ctx.createRadialGradient(b.x - wobR * 0.3, b.y - wobR * 0.35, 0, b.x - wobR * 0.18, b.y - wobR * 0.22, wobR * 0.5);
      shine.addColorStop(0, `rgba(255,255,255,${0.6 + glowAlpha * 0.2})`);
      shine.addColorStop(0.4, `rgba(255,255,255,${0.14 + glowAlpha * 0.08})`);
      shine.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(b.x, b.y, wobR, 0, Math.PI * 2);
      ctx.fillStyle = shine; ctx.fill();

      const s2 = ctx.createRadialGradient(b.x + wobR * 0.22, b.y + wobR * 0.3, 0, b.x + wobR * 0.22, b.y + wobR * 0.3, wobR * 0.22);
      s2.addColorStop(0, "rgba(255,255,255,0.18)");
      s2.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(b.x, b.y, wobR, 0, Math.PI * 2);
      ctx.fillStyle = s2; ctx.fill();

      if (b.squish > 0) ctx.restore();
    };

    const loop = () => {
      animId.current = requestAnimationFrame(loop);
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.current.x, my = mouse.current.y;

      for (const b of bubbles.current) {
        const dx = b.x - mx, dy = b.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        b.hovered = dist < b.r * 1.2;
        const repR = b.r * 2.6 + 50;
        if (dist < repR) {
          const f = (1 - dist / repR) * 0.038;
          b.ax = (dx / dist) * f; b.ay = (dy / dist) * f;
          b.squish = Math.min(1, b.squish + 0.08);
        } else {
          b.ax *= 0.88; b.ay *= 0.88;
          b.squish = Math.max(0, b.squish - 0.06);
        }
        b.vx = (b.vx + b.ax) * 0.972;
        b.vy = (b.vy + b.ay) * 0.972;
        b.x += b.vx; b.y += b.vy;
        b.wobble += b.wobbleSpd;
        const mg = b.r + 5;
        if (b.x < mg) { b.x = mg; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > W - mg) { b.x = W - mg; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.y < mg) { b.y = mg; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y > H - mg) { b.y = H - mg; b.vy = -Math.abs(b.vy) * 0.5; }
        drawBubble(b);
      }

      for (let i = pops.current.length - 1; i >= 0; i--) {
        const pop = pops.current[i];
        pop.progress += 0.045;
        const ringR = pop.baseR * (1 + pop.progress * 2.2);
        const ringAlpha = Math.max(0, 0.8 - pop.progress * 1.1);
        if (ringAlpha > 0) {
          ctx.beginPath(); ctx.arc(pop.x, pop.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `${pop.px}${ringAlpha})`; ctx.lineWidth = 2.5 * (1 - pop.progress); ctx.stroke();
          const ringR2 = pop.baseR * (1 + pop.progress * 1.2);
          ctx.beginPath(); ctx.arc(pop.x, pop.y, ringR2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${ringAlpha * 0.4})`; ctx.lineWidth = 1.5 * (1 - pop.progress); ctx.stroke();
        }
        for (let j = pop.particles.length - 1; j >= 0; j--) {
          const p = pop.particles[j];
          p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.vy += 0.08; p.life -= 0.028; p.r *= 0.978;
          if (p.life <= 0) { pop.particles.splice(j, 1); continue; }
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, `${p.px}${p.life})`); grad.addColorStop(1, `${p.px}0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        }
        if (pop.progress > 1.2 && pop.particles.length === 0) pops.current.splice(i, 1);
      }
    };

    loop();
    return () => {
      cancelAnimationFrame(animId.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [handlePop]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      style={{ zIndex: 1 }}
    />
  );
}
