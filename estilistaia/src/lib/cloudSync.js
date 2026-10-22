/**
 * Sincroniza el estado de la app con la tabla user_state de Supabase.
 * - Al iniciar sesión: si la cuenta ya tiene datos, se cargan en este dispositivo;
 *   si es nueva, se sube lo que había en el dispositivo.
 * - Después, cada cambio se guarda con una demora de 1,2 s.
 * La foto de cuerpo entero NO se sincroniza: queda solo en el dispositivo.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';

export function useCloudSync(user, snapshot, apply) {
  const [status, setStatus] = useState('local'); // local | loading | saving | saved | error
  const [tick, setTick] = useState(0);
  const ready = useRef(false);
  const json = JSON.stringify(snapshot);

  useEffect(() => {
    ready.current = false;
    if (!user || !supabase) { setStatus('local'); return undefined; }
    let cancelled = false;
    setStatus('loading');
    supabase.from('user_state').select('data').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setStatus('error'); return; }
      if (data?.data && Object.keys(data.data).length) apply(data.data);
      ready.current = true;
      setTick((t) => t + 1); // fuerza un guardado inicial si la cuenta era nueva
    });
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !supabase || !ready.current) return undefined;
    setStatus('saving');
    const t = setTimeout(async () => {
      const { error } = await supabase.from('user_state').upsert({ user_id: user.id, data: JSON.parse(json), updated_at: new Date().toISOString() });
      setStatus(error ? 'error' : 'saved');
    }, 1200);
    return () => clearTimeout(t);
  }, [json, tick, user?.id]);

  return status;
}
