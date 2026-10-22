/**
 * EstilistaIA · App raíz
 * ------------------------------------------------------------
 * Estado global (guardado en el dispositivo):
 *   profile   → nombre, estilo, silueta, medidas
 *   comfort   → nivel 1–5 de hoy (controla toda la app)
 *   symptoms  → síntomas del día
 *   wardrobe  → prendas
 *   log       → historial { 'AAAA-MM-DD': nivel }
 *   plan      → ocasión y clima elegidos
 *   premium   → prueba, referidos y suscripción, leídos de Supabase (lib/premium.js)
 * Con sesión iniciada, todo menos la foto de cuerpo entero se sincroniza
 * con la tabla user_state (lib/cloudSync.js).
 * El motor de outfits se recalcula con useMemo cada vez que algo cambia.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ComfortQuick } from './components/ComfortTape.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { BodyScan } from './components/BodyScan.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { dimsFromBody } from './lib/bodyMeasure.js';
import { PlansModal, PremiumBanner } from './components/Premium.jsx';
import { ShareModal } from './components/ShareModal.jsx';
import { Icon } from './components/ui.jsx';
import { DEFAULT_PROFILE, SEED_WARDROBE } from './data/seed.js';
import { suggestOutfits } from './engine/outfitEngine.js';
import { usePersistentState } from './hooks/usePersistentState.js';
import { signOut, useAuth } from './lib/auth.js';
import { useCloudSync } from './lib/cloudSync.js';
import { usePremium } from './lib/premium.js';
import { HAS_CLOUD } from './lib/supabase.js';
import { dateKey } from './lib/utils.js';
import { cleanSymptoms, examplesFor, getGenderConfig } from './lib/gender.js';
import { useWeather } from './lib/weather.js';
import { APP_VERSION } from './version.js';
import OutfitsScreen from './screens/OutfitsScreen.jsx';
import SizesScreen from './screens/SizesScreen.jsx';
import TodayScreen from './screens/TodayScreen.jsx';
import TryOnScreen from './screens/TryOnScreen.jsx';
import WardrobeScreen from './screens/WardrobeScreen.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: 'today' },
  { id: 'guardarropa', label: 'Mi ropa', icon: 'hanger' },
  { id: 'outfits', label: 'Outfits', icon: 'spark' },
  { id: 'probador', label: 'Probador', icon: 'mirror' },
  { id: 'talles', label: 'Talles', icon: 'ruler' },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <path d="M6 9 L12 3 H26 V29 H6 Z" fill="var(--tape)" />
        <circle cx="12.5" cy="9.5" r="2.4" fill="var(--paper)" />
        <path d="M10 16h12M10 20h9M10 24h11" stroke="var(--tape-ink)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[1.35rem] font-bold tracking-tight">EstilistaIA</span>
    </span>
  );
}

const SYNC_LABEL = { local: 'Solo en este dispositivo', loading: 'Cargando tu cuenta…', saving: 'Guardando…', saved: 'Guardado en tu cuenta', error: 'No se pudo guardar. Reintentamos con el próximo cambio.' };

/** Estado de la cuenta en la barra lateral. */
function AccountBox({ user, sync, onLogin }) {
  if (!HAS_CLOUD) return <p className="text-[0.8rem] leading-relaxed text-muted">Tus prendas y medidas se guardan solo en este dispositivo.</p>;
  if (!user) {
    return (
      <div className="space-y-2">
        <p className="text-[0.8rem] leading-relaxed text-muted">Tus datos están solo en este dispositivo. Entrá para guardarlos en tu cuenta.</p>
        <button type="button" onClick={onLogin} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold hover:border-ink">Crear cuenta o entrar</button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="truncate text-sm font-bold" title={user.email}>{user.email}</p>
      <p className={`text-[0.8rem] ${sync === 'error' ? 'text-bad' : 'text-muted'}`} role="status">{SYNC_LABEL[sync]}</p>
      <button type="button" onClick={signOut} className="text-[0.8rem] font-bold text-accent underline underline-offset-2">Cerrar sesión</button>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = usePersistentState('estilistaia:profile', DEFAULT_PROFILE);
  const [comfort, setComfortRaw] = usePersistentState('estilistaia:comfort', 2);
  const [symptoms, setSymptoms] = usePersistentState('estilistaia:symptoms', []);
  const [wardrobe, setWardrobe] = usePersistentState('estilistaia:wardrobe', SEED_WARDROBE);
  const [log, setLog] = usePersistentState('estilistaia:log', {});
  const [plan, setPlan] = usePersistentState('estilistaia:plan', { occasion: 'casual', season: 'templado' });
  const [bodyPhoto, setBodyPhoto] = usePersistentState('estilistaia:bodyPhoto', null);
  const [tab, setTab] = useState('hoy');
  const [override, setOverride] = useState(null); // outfit elegido a mano en el probador

  // Cuenta (Supabase Auth) y sincronización entre dispositivos.
  const auth = useAuth();
  const [authModal, setAuthModal] = useState({ open: false, reason: '' });
  const requestAuth = useCallback((reason = '') => setAuthModal({ open: true, reason }), []);
  const syncStatus = useCloudSync(auth.user, { profile, wardrobe, log, plan, symptoms, comfort }, (remote) => {
    if (remote.profile) setProfile(remote.profile);
    if (remote.wardrobe) setWardrobe(remote.wardrobe);
    if (remote.log) setLog((l) => ({ ...remote.log, ...l }));
    if (remote.plan) setPlan(remote.plan);
    if (remote.symptoms) setSymptoms(remote.symptoms);
  });

  // Escaneo corporal: se abre desde Hoy, el probador o la bienvenida.
  const [scan, setScan] = useState({ open: false, mode: 'scan' });
  const openScan = useCallback((mode = 'scan') => setScan({ open: true, mode: typeof mode === 'string' ? mode : 'scan' }), []);
  /** Guarda el cuerpo: medidas para talles, silueta para el motor y la foto (solo local) para el probador. */
  const saveBody = useCallback((body, photo) => {
    setProfile((p) => ({ ...p, body, heightCm: body.heightCm, measures: body.measures, bodyShape: getGenderConfig(p.style).shapeFor(body.shape) }));
    if (photo) setBodyPhoto(photo);
  }, [setProfile, setBodyPhoto]);
  // Género: decide síntomas, prendas, siluetas, términos y tabla de talles (lib/gender.js).
  const genderCfg = useMemo(() => getGenderConfig(profile.style), [profile.style]);
  /** Cambiar de género adapta todo de una vez: silueta, tabla de talles, síntomas y ropa de ejemplo. */
  const changeGender = useCallback((style) => {
    const cfg = getGenderConfig(style);
    setProfile((p) => ({ ...p, style, bodyShape: cfg.shapeFor(p.bodyShape), sizeCut: cfg.sizeCut ?? p.sizeCut }));
    setSymptoms((s) => cleanSymptoms(s, style));
    setWardrobe((w) => (w.some((g) => g.example) ? [...w.filter((g) => !g.example), ...examplesFor(style)] : w));
  }, [setProfile, setSymptoms, setWardrobe]);
  // Avatar: tus medidas si las hay; si no, la silueta tipo de tu género.
  const avatarDims = useMemo(
    () => (profile.body ? dimsFromBody(profile.body) : genderCfg.shapeInfo(profile.bodyShape).dims),
    [profile.body, profile.bodyShape, genderCfg],
  );

  // Clima automático: el motor usa el clima real en vez de "templado" fijo.
  const weather = useWeather();
  useEffect(() => {
    if (weather.season && weather.season !== plan.season) setPlan((p) => ({ ...p, season: weather.season }));
  }, [weather.season]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monetización: prueba de 7 días, referidos y suscripción real con Stripe.
  const premiumPlan = usePremium(auth, requestAuth);
  const { isPremium } = premiumPlan;
  const [plans, setPlans] = useState({ open: false, reason: '' });
  const [shareOpen, setShareOpen] = useState(false);
  /** Las pantallas llaman a esto al tocar algo bloqueado. */
  const requestPremium = useCallback((reason = '') => setPlans({ open: true, reason }), []);
  const openShare = () => { setPlans({ open: false, reason: '' }); setShareOpen(true); };

  // Si vuelve a gratuita, se descarta la selección manual del probador (es Premium).
  useEffect(() => { if (!isPremium) setOverride(null); }, [isPremium]);

  // Registrar el nivel del día al abrir la app.
  useEffect(() => {
    setLog((l) => (l[dateKey()] ? l : { ...l, [dateKey()]: comfort }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Cambiar el nivel actualiza el registro y descarta la selección manual,
   *  así el probador salta en tiempo real a la opción adecuada. */
  const setComfort = useCallback((v) => {
    setComfortRaw(v);
    setLog((l) => ({ ...l, [dateKey()]: v }));
    setOverride(null);
  }, [setComfortRaw, setLog]);

  const ctx = useMemo(() => ({
    comfort, symptoms, occasion: plan.occasion, season: plan.season, bodyShape: profile.bodyShape,
    shapeTip: genderCfg.shapeInfo(profile.bodyShape).tip, rain: weather.rainy,
  }), [comfort, symptoms, plan.occasion, plan.season, profile.bodyShape, genderCfg, weather.rainy]);
  const result = useMemo(() => suggestOutfits(wardrobe, ctx), [wardrobe, ctx]);

  const goTo = (id) => { setTab(id); window.scrollTo({ top: 0 }); };
  const shared = { profile, setProfile, comfort, setComfort, symptoms, setSymptoms, wardrobe, setWardrobe, log, plan, setPlan, result, isPremium, requestPremium, avatarDims, openScan, genderCfg, changeGender, weather };
  const tryOn = (pieces) => { setOverride(pieces); goTo('probador'); };

  const screens = {
    hoy: <TodayScreen {...shared} goTo={goTo} bodyPhoto={bodyPhoto} onTryOn={tryOn} />,
    guardarropa: <WardrobeScreen {...shared} />,
    outfits: <OutfitsScreen {...shared} onTryOn={tryOn} />,
    probador: <TryOnScreen {...shared} override={override} setOverride={setOverride} bodyPhoto={bodyPhoto} setBodyPhoto={setBodyPhoto} />,
    talles: <SizesScreen {...shared} />,
  };

  return (
    <div className="min-h-full md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      {/* Navegación lateral (escritorio) */}
      <aside className="hidden border-r border-line md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col md:px-4 md:py-6">
        <div className="px-2"><Wordmark /></div>
        <nav aria-label="Secciones" className="mt-10 flex flex-col gap-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => goTo(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${tab === t.id ? 'bg-surface font-bold text-ink shadow-[inset_3px_0_0_var(--accent)]' : 'text-muted hover:bg-sunk hover:text-ink'}`}>
              <Icon name={t.icon} /> {t.label}
            </button>
          ))}
        </nav>
        <button type="button" onClick={openShare} className="mt-8 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted hover:bg-sunk hover:text-ink">
          <Icon name="share" /> Invitar a un amige
        </button>
        <div className="mt-auto px-2"><AccountBox user={auth.user} sync={syncStatus} onLogin={() => requestAuth('')} /><p className="mt-3 text-[0.75rem] text-muted">Versión {APP_VERSION}</p></div>
      </aside>

      <div className="min-w-0">
        <PremiumBanner plan={premiumPlan} onShare={openShare} onPlans={() => requestPremium('')} />
        <header className="app-header sticky z-30 border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <span className="md:hidden"><Wordmark /></span>
            <span className="hidden text-sm text-muted md:inline">{TABS.find((t) => t.id === tab)?.label}</span>
            <span className="flex items-center gap-2">
              <ComfortQuick value={comfort} onChange={setComfort} />
              {HAS_CLOUD && !auth.user && (
                <button type="button" onClick={() => requestAuth('')} className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-accent hover:bg-sunk md:hidden">Entrar</button>
              )}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 pb-32 pt-6 sm:px-8 md:pb-14">
          {screens[tab]}
          {tab === 'hoy' && <section className="panel mt-6 p-5 md:hidden" aria-label="Tu cuenta"><AccountBox user={auth.user} sync={syncStatus} onLogin={() => requestAuth('')} /></section>}
        </main>
      </div>

      <PlansModal open={plans.open} reason={plans.reason} plan={premiumPlan} onClose={() => setPlans({ open: false, reason: '' })} onShare={openShare} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} plan={premiumPlan} requestAuth={requestAuth} />
      <BodyScan open={scan.open} startWith={scan.mode} onClose={() => setScan((x) => ({ ...x, open: false }))} onSave={saveBody}
        initialHeight={profile.heightCm || 165} initialMeasures={profile.measures} style={profile.style} />
      {profile.onboarded === false && (
        <Onboarding profile={profile} setProfile={setProfile} comfort={comfort} setComfort={setComfort} openScan={openScan} genderCfg={genderCfg} changeGender={changeGender}
          onLogin={HAS_CLOUD && !auth.user ? () => requestAuth('') : null}
          onDone={() => { setProfile((p) => ({ ...p, onboarded: true })); goTo('hoy'); }} />
      )}
      {HAS_CLOUD && <AuthModal open={authModal.open} reason={authModal.reason} onClose={() => setAuthModal({ open: false, reason: '' })} />}

      {/* Barra inferior (móvil) */}
      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="grid grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => goTo(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-h-[4rem] flex-col items-center justify-center gap-1 text-[0.8rem] ${tab === t.id ? 'font-bold text-accent' : 'text-muted'}`}>
              <span className={`flex h-8 w-14 items-center justify-center rounded-full ${tab === t.id ? 'bg-accent-soft' : ''}`}><Icon name={t.icon} className="h-6 w-6" /></span> {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
