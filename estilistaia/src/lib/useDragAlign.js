/**
 * Arrastrar la ropa sobre la foto con el dedo (o el mouse).
 *  - 1 dedo, de izquierda a derecha → mueve la ropa a los costados.
 *  - 2 dedos, abriendo o cerrando  → agranda o achica la ropa.
 * El desplazamiento vertical queda para el scroll de la página (touch-action: pan-y),
 * así la pantalla se sigue pudiendo bajar con el dedo encima de la foto.
 * Para subir o bajar la ropa está el deslizador "Subir / bajar".
 */
import { useCallback, useEffect, useRef } from 'react';
import { ALIGN_LIMITS } from './photoAlign.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);

/** @returns props para el contenedor de la foto: { ref, onPointerDown, ..., style } */
export function useDragAlign(enabled, align, setAlign, viewBoxWidth = 300) {
  const ref = useRef(null);
  const pointers = useRef(new Map());
  const start = useRef(null);
  const alignRef = useRef(align);
  useEffect(() => { alignRef.current = align; }, [align]);

  // Cada vez que cambia la cantidad de dedos, se toma la posición actual como nuevo punto de partida.
  const rebase = () => { start.current = { align: { ...alignRef.current }, pts: new Map(pointers.current) }; };

  const onPointerDown = useCallback((e) => {
    if (!enabled) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebase();
  }, [enabled]);

  const onPointerMove = useCallback((e) => {
    if (!enabled || !pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = start.current;
    if (pointers.current.size === 1) {
      const p0 = st.pts.get(e.pointerId);
      if (!p0) return;
      // px de pantalla → unidades del lienzo (300 de ancho), descontando la escala de la ropa.
      const k = viewBoxWidth / ref.current.getBoundingClientRect().width / (st.align.s || 1);
      const dx = Math.round(clamp(st.align.dx + (e.clientX - p0.x) * k, -ALIGN_LIMITS.dx, ALIGN_LIMITS.dx));
      if (dx !== alignRef.current.dx) setAlign((a) => ({ ...a, dx }));
    } else if (pointers.current.size === 2 && st.pts.size === 2) {
      const s = +clamp(st.align.s * (dist([...pointers.current.values()]) / dist([...st.pts.values()])), ALIGN_LIMITS.sMin, ALIGN_LIMITS.sMax).toFixed(2);
      if (s !== alignRef.current.s) setAlign((a) => ({ ...a, s }));
    }
  }, [enabled, setAlign, viewBoxWidth]);

  const onPointerEnd = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    rebase();
  }, []);

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    style: enabled ? { touchAction: 'pan-y', cursor: 'grab', userSelect: 'none' } : undefined,
  };
}
