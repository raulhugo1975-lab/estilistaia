/**
 * EstilistaIA · Premium con Supabase + Stripe
 * ------------------------------------------------------------
 * Fuente de verdad en Supabase:
 *   profiles.trial_started_at → prueba de 7 días (una por cuenta, hora del servidor)
 *   profiles.ref_code / referred_by → referidos
 *   subscriptions → estado real de Stripe (lo escribe el webhook)
 * MODO DEMO (VITE_SHOW_PREMIUM_SIMULATOR=true, o en desarrollo):
 *   todas las funciones Premium quedan abiertas por defecto para testers, y la
 *   franja superior permite ver la app "como Premium", "como gratuita" o "en prueba"
 *   (con "+1 día" para simular el vencimiento). NUNCA lo actives en el sitio público:
 *   cualquiera tendría Premium sin pagar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase.js';

export const TRIAL_DAYS = 7;
const DAY = 864e5;
const env = import.meta.env;
export const SHOW_SIMULATOR = env.DEV || env.VITE_SHOW_PREMIUM_SIMULATOR === 'true';
export const DEMO_MODE = SHOW_SIMULATOR;
export const PRICE_LABEL = env.VITE_PRICE_LABEL || '';
const PUBLIC_URL = () => (env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
const PENDING_REF = 'estilistaia:pendingRef';

export const FREE_LIMITS = { wardrobe: 20, outfits: 1 };
export const PLAN_FEATURES = [
  { id: 'wardrobe', label: 'Guardarropa', free: `Hasta ${FREE_LIMITS.wardrobe} prendas`, premium: 'Ilimitado' },
  { id: 'outfits', label: 'Sugerencias de outfits', free: `${FREE_LIMITS.outfits} por ocasión`, premium: 'Ilimitadas, con varias opciones' },
  { id: 'tryon', label: 'Probador', free: 'Silueta con la sugerencia principal', premium: 'Completo: tu foto y capas a mano' },
  { id: 'sync', label: 'Tus datos', free: 'Sincronizados con tu cuenta', premium: 'Sincronizados con tu cuenta' },
];

export const referralLink = (code) => `${PUBLIC_URL()}/invitacion?ref=${encodeURIComponent(code)}`;
const ACTIVE = ['active', 'trialing'];

function trialStatus(startedAt, offsetDays = 0) {
  if (!startedAt) return { active: false, expired: false, left: 0, used: false };
  const days = Math.floor((Date.now() + offsetDays * DAY - new Date(startedAt).getTime()) / DAY);
  const left = Math.max(0, TRIAL_DAYS - days);
  return { active: left > 0, expired: left === 0, left, used: true };
}

/** Saca ?checkout, ?session_id y ?ref de la URL sin tocar el #hash (donde Supabase deja la sesión). */
function cleanUrl() {
  window.history.replaceState(null, '', '/' + window.location.hash);
}

/**
 * @param {{ session: object|null, user: object|null, ready: boolean }} auth
 * @param {(reason: string) => void} requestAuth  abre el inicio de sesión
 */
export function usePremium(auth, requestAuth) {
  const { session, user, ready } = auth;
  const [account, setAccount] = useState({ profile: null, subscription: null, referrals: 0 });
  const [billing, setBilling] = useState({ loading: false, error: '', notice: '' });
  // Modo demo: 'premium' (por defecto) | 'free' | 'trial'. Se recuerda en el dispositivo.
  const [sim, setSim] = useState(() => {
    try { return JSON.parse(localStorage.getItem('estilistaia:demoView')) || { view: 'premium', offsetDays: 0, startedAt: null }; } catch { return { view: 'premium', offsetDays: 0, startedAt: null }; }
  });
  useEffect(() => { try { localStorage.setItem('estilistaia:demoView', JSON.stringify(sim)); } catch { /* nada */ } }, [sim]);
  const pendingSession = useRef(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) { setAccount({ profile: null, subscription: null, referrals: 0 }); return; }
    const [p, s, r] = await Promise.all([
      supabase.from('profiles').select('ref_code, referred_by, trial_started_at').eq('id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('status, current_period_end, cancel_at_period_end').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('my_referral_count'),
    ]);
    setAccount({ profile: p.data, subscription: s.data, referrals: r.data ?? 0 });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir: guardar ?ref para después del login y recordar la vuelta de Stripe.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) { try { localStorage.setItem(PENDING_REF, ref.replace(/[^a-z0-9_-]/gi, '').slice(0, 40)); } catch { /* sin almacenamiento */ } }
    if (params.get('checkout') === 'success') pendingSession.current = params.get('session_id');
    if (params.get('checkout') === 'cancel') setBilling({ loading: false, error: '', notice: 'Cancelaste el pago. No se hizo ningún cobro.' });
    if (ref || params.get('checkout')) cleanUrl();
  }, []);

  // Con sesión iniciada: cargar cuenta, reclamar invitación pendiente y confirmar pagos.
  useEffect(() => {
    if (!ready || !user || !supabase) { setAccount({ profile: null, subscription: null, referrals: 0 }); return; }
    (async () => {
      let ref = null;
      try { ref = localStorage.getItem(PENDING_REF); } catch { /* nada */ }
      if (ref) {
        const { data: claimed } = await supabase.rpc('claim_referral', { code: ref });
        try { localStorage.removeItem(PENDING_REF); } catch { /* nada */ }
        if (claimed) setBilling({ loading: false, error: '', notice: `Llegaste con una invitación: tenés ${TRIAL_DAYS} días de Premium gratis.` });
      }
      const sessionId = pendingSession.current;
      if (sessionId) {
        pendingSession.current = null;
        setBilling({ loading: true, error: '', notice: '' });
        try {
          const res = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error);
          setBilling({ loading: false, error: '', notice: data.active ? 'Listo: tu suscripción Premium está activa.' : 'Estamos confirmando el pago con Stripe. Puede tardar unos segundos.' });
        } catch (e) {
          setBilling({ loading: false, error: e.message || 'No pudimos confirmar el pago.', notice: '' });
        }
      }
      await refresh();
    })();
  }, [ready, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = account.subscription;
  const isPro = !!sub && ACTIVE.includes(sub.status);
  const status = useMemo(
    () => (DEMO_MODE ? trialStatus(sim.view === 'trial' ? sim.startedAt : null, sim.offsetDays) : trialStatus(account.profile?.trial_started_at)),
    [sim, account.profile?.trial_started_at],
  );
  const isPremium = DEMO_MODE ? sim.view === 'premium' || status.active : isPro || status.active;
  const canStartTrial = DEMO_MODE ? sim.view !== 'trial' : !status.used;

  const callApi = useCallback(async (path) => {
    setBilling({ loading: true, error: '', notice: '' });
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'El servidor no respondió. Probá de nuevo.');
      window.location.assign(data.url);
    } catch (e) {
      setBilling({ loading: false, error: e.message, notice: '' });
    }
  }, [session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback(() => (user ? callApi('/api/checkout') : requestAuth('Creá tu cuenta o iniciá sesión para suscribirte. Así Premium te sigue en todos tus dispositivos.')), [user, callApi, requestAuth]);
  const manage = useCallback(() => callApi('/api/portal'), [callApi]);

  const startTrial = useCallback(async () => {
    if (DEMO_MODE) { setSim({ view: 'trial', offsetDays: 0, startedAt: new Date().toISOString() }); return; }
    if (!user) { requestAuth(`Creá tu cuenta gratis para activar los ${TRIAL_DAYS} días de Premium. No pedimos tarjeta.`); return; }
    const { error } = await supabase.rpc('start_trial');
    if (error) setBilling({ loading: false, error: 'No pudimos activar la prueba. Probá de nuevo.', notice: '' });
    await refresh();
  }, [user, requestAuth, refresh]);

  const simulator = DEMO_MODE ? {
    view: sim.view,
    setView: (view) => setSim({ view, offsetDays: 0, startedAt: view === 'trial' ? new Date().toISOString() : null }),
    advanceDay: () => setSim((s) => ({ ...s, offsetDays: s.offsetDays + 1 })),
  } : null;

  return {
    user, account, status, isPro, isPremium, canStartTrial, billing,
    refCode: account.profile?.ref_code ?? null,
    startTrial, subscribe, manage, simulator,
  };
}
