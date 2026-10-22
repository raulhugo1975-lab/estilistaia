/**
 * Controles para acomodar la ropa sobre la foto, con botones grandes.
 * Funcionan igual en cualquier teléfono, sin gestos: un toque mueve un poco
 * y mantener apretado sigue moviendo.
 *   - Flechas ◀ ▶ sobre los costados de la foto (se ve el efecto mientras se toca).
 *   - Debajo: subir / bajar y achicar / agrandar.
 */
import React, { useEffect, useRef } from 'react';
import { ALIGN_LIMITS } from '../lib/photoAlign.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const STEP = { dx: 3, dy: 3, s: 0.02 };

/** Botón que repite la acción mientras se mantiene apretado. */
export function HoldButton({ onStep, label, children, className = '' }) {
  const timers = useRef([]);
  const lastPointer = useRef(0);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current.forEach(clearInterval); timers.current = []; };
  useEffect(() => stop, []);
  const start = (e) => {
    e.stopPropagation(); // que no arrastre la foto
    e.preventDefault();
    lastPointer.current = Date.now();
    onStep();
    timers.current.push(setTimeout(() => timers.current.push(setInterval(onStep, 60)), 350));
  };
  return (
    <button type="button" aria-label={label} title={label}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      // Teclado y lectores de pantalla. Se ignora el "click" que algunos teléfonos mandan después del toque.
      onClick={() => { if (Date.now() - lastPointer.current > 600) onStep(); }}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none touch-none ${className}`}>
      {children}
    </button>
  );
}

/** Flechas grandes sobre los costados de la foto. */
export function SideArrows({ setAlign }) {
  const move = (dir) => setAlign((a) => ({ ...a, dx: clamp(a.dx + dir * STEP.dx, -ALIGN_LIMITS.dx, ALIGN_LIMITS.dx) }));
  const cls = 'absolute top-1/2 flex h-16 w-14 -translate-y-1/2 items-center justify-center bg-ink text-3xl font-bold text-paper opacity-85 shadow-lg active:scale-95';
  return (
    <>
      <HoldButton label="Mover la ropa a la izquierda" onStep={() => move(-1)} className={`${cls} left-0 rounded-r-2xl`}>◀</HoldButton>
      <HoldButton label="Mover la ropa a la derecha" onStep={() => move(1)} className={`${cls} right-0 rounded-l-2xl`}>▶</HoldButton>
    </>
  );
}

/** Subir / bajar y achicar / agrandar, debajo de la foto. */
export function AdjustPad({ align, setAlign }) {
  const up = (dir) => setAlign((a) => ({ ...a, dy: clamp(a.dy + dir * STEP.dy, -ALIGN_LIMITS.dy, ALIGN_LIMITS.dy) }));
  const size = (dir) => setAlign((a) => ({ ...a, s: +clamp(a.s + dir * STEP.s, ALIGN_LIMITS.sMin, ALIGN_LIMITS.sMax).toFixed(2) }));
  const side = (dir) => setAlign((a) => ({ ...a, dx: clamp(a.dx + dir * STEP.dx, -ALIGN_LIMITS.dx, ALIGN_LIMITS.dx) }));
  const btn = 'flex min-h-[3.5rem] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface px-2 text-[1rem] font-bold active:border-accent active:bg-accent-soft';
  const where = align.dx === 0 ? 'centrada' : `corrida a la ${align.dx < 0 ? 'izquierda' : 'derecha'}`;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <HoldButton label="Mover a la izquierda" onStep={() => side(-1)} className={btn}><span aria-hidden="true">◀</span> Izquierda</HoldButton>
        <HoldButton label="Mover a la derecha" onStep={() => side(1)} className={btn}>Derecha <span aria-hidden="true">▶</span></HoldButton>
      </div>
      <div className="flex gap-2">
        <HoldButton label="Subir la ropa" onStep={() => up(-1)} className={btn}><span aria-hidden="true">▲</span> Subir</HoldButton>
        <HoldButton label="Bajar la ropa" onStep={() => up(1)} className={btn}><span aria-hidden="true">▼</span> Bajar</HoldButton>
      </div>
      <div className="flex gap-2">
        <HoldButton label="Achicar la ropa" onStep={() => size(-1)} className={btn}><span aria-hidden="true" className="text-xl">−</span> Achicar</HoldButton>
        <HoldButton label="Agrandar la ropa" onStep={() => size(1)} className={btn}><span aria-hidden="true" className="text-xl">+</span> Agrandar</HoldButton>
      </div>
      <p className="text-center text-[0.88rem] text-muted" aria-live="polite">Ropa {where}, tamaño {Math.round(align.s * 100)}%</p>
    </div>
  );
}
