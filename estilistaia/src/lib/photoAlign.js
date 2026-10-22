/**
 * Ajuste de la ropa sobre la foto de cuerpo entero (izq./der., arriba/abajo, tamaño).
 * Se guarda en el dispositivo junto con una "firma" de la foto: si la foto cambia,
 * el ajuste vuelve solo al centro. Lo usan el probador y el outfit de Hoy.
 */
import { useCallback, useMemo } from 'react';
import { usePersistentState } from '../hooks/usePersistentState.js';

export const CENTERED = { dx: 0, dy: 0, s: 1 };
export const ALIGN_LIMITS = { dx: 80, dy: 80, sMin: 0.7, sMax: 1.3 };

/** Firma liviana de la foto (no guardamos la foto dos veces). */
const signature = (photo) => (photo ? `${photo.length}:${photo.slice(-24)}` : '');

export function usePhotoAlign(photo) {
  const [saved, setSaved] = usePersistentState('estilistaia:photoAlign', { sig: '', ...CENTERED });
  const sig = signature(photo);
  const align = useMemo(() => (saved.sig === sig ? { dx: saved.dx ?? 0, dy: saved.dy ?? 0, s: saved.s ?? 1 } : CENTERED), [saved, sig]);
  const setAlign = useCallback((update) => setSaved((prev) => {
    const base = prev.sig === sig ? prev : { sig, ...CENTERED };
    const next = typeof update === 'function' ? update(base) : update;
    return { ...base, ...next, sig };
  }), [setSaved, sig]);
  const reset = useCallback(() => setSaved({ sig, ...CENTERED }), [setSaved, sig]);
  const isCentered = align.dx === 0 && align.dy === 0 && align.s === 1;
  return { align, setAlign, reset, isCentered };
}
