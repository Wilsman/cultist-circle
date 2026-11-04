"use client";

import { useEffect, useRef } from "react";
import { BUCKET_CURSOR_CSS, BUCKET_RIM_OFFSET } from "@/lib/halloween";
import { useHalloweenCursor } from "@/hooks/use-halloween-cursor";

type SweetKind = "wrapped" | "corn" | "lolly" | "sparkle";

type Sweet = {
  kind: SweetKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
};

const MAX_SWEETS = 90;
// Sweets hang in the trail for a moment, then gravity ramps up and they drop.
const HANG_FRAMES = 22;
const RAMP_FRAMES = 25;
const HANG_GRAVITY = 0.008;
const FALL_GRAVITY = 0.11;
const SPAWN_DISTANCE = 14; // px of movement per sweet
const SWEET_COLORS = ["#f472b6", "#a855f7", "#4ade80", "#38bdf8", "#facc15", "#fb923c"];
const SPARKLE_COLORS = ["#fde68a", "#e9d5ff", "#fbcfe8"];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function makeSweet(x: number, y: number, burst = false): Sweet {
  const roll = Math.random();
  const kind: SweetKind =
    roll < 0.3 ? "sparkle" : roll < 0.6 ? "wrapped" : roll < 0.85 ? "corn" : "lolly";
  const speed = burst ? 1.5 + Math.random() * 2.5 : Math.random() * 0.35;
  const angle = Math.random() * Math.PI * 2;
  const maxLife = kind === "sparkle" ? 45 + Math.random() * 25 : 90 + Math.random() * 40;
  return {
    kind,
    x: x + (Math.random() - 0.5) * 12,
    y: y + (Math.random() - 0.5) * 4,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.12,
    size: kind === "sparkle" ? 2 + Math.random() * 2 : 4 + Math.random() * 2.5,
    color: kind === "sparkle" ? pick(SPARKLE_COLORS) : pick(SWEET_COLORS),
    life: maxLife,
    maxLife,
  };
}

function drawSweet(ctx: CanvasRenderingContext2D, s: Sweet) {
  const r = s.size;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.globalAlpha = Math.min(1, (s.life / s.maxLife) * 1.6);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(20,12,8,0.7)";

  switch (s.kind) {
    case "wrapped": {
      ctx.fillStyle = s.color;
      // Twisted wrapper ends
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r * 1.9, -r * 0.7);
      ctx.lineTo(-r * 1.9, r * 0.7);
      ctx.closePath();
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 1.9, -r * 0.7);
      ctx.lineTo(r * 1.9, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "corn": {
      const h = r * 2.2;
      const w = r * 1.6;
      const band = (top: number, bottom: number, color: string) => {
        const t0 = top / h;
        const t1 = bottom / h;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo((-w / 2) * t0, -h / 2 + top);
        ctx.lineTo((w / 2) * t0, -h / 2 + top);
        ctx.lineTo((w / 2) * t1, -h / 2 + bottom);
        ctx.lineTo((-w / 2) * t1, -h / 2 + bottom);
        ctx.closePath();
        ctx.fill();
      };
      band(0, h * 0.35, "#fefce8");
      band(h * 0.35, h * 0.7, "#fb923c");
      band(h * 0.7, h, "#facc15");
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "lolly": {
      ctx.strokeStyle = "#f5f5f4";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(0, r * 2.6);
      ctx.stroke();
      ctx.fillStyle = s.color;
      ctx.strokeStyle = "rgba(20,12,8,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const rr = (a / (Math.PI * 4)) * r * 0.85;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
      break;
    }
    case "sparkle": {
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 === 0 ? r * 1.8 : r * 0.5;
        const a = (i * Math.PI) / 4;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/**
 * Seasonal pumpkin-bucket cursor that spills sweets as it moves.
 * Only runs in Halloween season, when switched on, on mouse devices and
 * without reduced motion.
 */
export function HalloweenCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enabled } = useHalloweenCursor();

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Bucket cursor, unless an element sets its own (pointer, text, etc.)
    const style = document.createElement("style");
    style.textContent = `html, body { cursor: ${BUCKET_CURSOR_CSS}; }`;
    document.head.appendChild(style);

    const sweets: Sweet[] = [];
    let frame = 0;
    let lastX: number | null = null;
    let lastY: number | null = null;
    let carry = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = sweets.length - 1; i >= 0; i--) {
        const s = sweets[i];
        const age = s.maxLife - s.life;
        const ramp = Math.min(1, Math.max(0, (age - HANG_FRAMES) / RAMP_FRAMES));
        const gravity = HANG_GRAVITY + (FALL_GRAVITY - HANG_GRAVITY) * ramp;
        s.vy += s.kind === "sparkle" ? gravity * 0.3 : gravity;
        s.vx *= 0.97;
        s.x += s.vx;
        s.y += s.vy;
        s.rot += s.spin;
        s.life -= 1;
        if (s.life <= 0 || s.y > window.innerHeight + 20) {
          sweets.splice(i, 1);
          continue;
        }
        drawSweet(ctx, s);
      }
      frame = sweets.length > 0 ? requestAnimationFrame(tick) : 0;
    };

    const add = (sweet: Sweet) => {
      if (sweets.length >= MAX_SWEETS) sweets.shift();
      sweets.push(sweet);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = e.clientX + BUCKET_RIM_OFFSET.x;
      const y = e.clientY + BUCKET_RIM_OFFSET.y;
      if (lastX !== null && lastY !== null) {
        carry += Math.hypot(x - lastX, y - lastY);
        while (carry >= SPAWN_DISTANCE) {
          carry -= SPAWN_DISTANCE;
          add(makeSweet(x, y));
        }
      }
      lastX = x;
      lastY = y;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = e.clientX + BUCKET_RIM_OFFSET.x;
      const y = e.clientY + BUCKET_RIM_OFFSET.y;
      for (let i = 0; i < 10; i++) add(makeSweet(x, y, true));
    };

    const onLeave = () => {
      lastX = null;
      lastY = null;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      style.remove();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] h-screen w-screen"
    />
  );
}
