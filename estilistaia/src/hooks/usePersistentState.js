import { useEffect, useState } from 'react';

/**
 * useState que se guarda en localStorage del dispositivo.
 * Si el almacenamiento falla (modo privado, cuota llena), la app
 * sigue funcionando en memoria.
 */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch { /* sin almacenamiento: usamos el valor inicial */ }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[EstilistaIA] No se pudo guardar "${key}":`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
