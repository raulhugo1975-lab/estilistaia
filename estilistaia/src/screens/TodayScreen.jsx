/**
 * Hoy · la pantalla principal
 * ------------------------------------------------------------
 * Arriba: clima (automático) y el botón [ GENERAR OUTFIT DE HOY ], visibles sin bajar.
 * La ocasión y la comodidad ya vienen completas y se cambian en "Ajustes de hoy".
 * El resultado aparece sobre tu foto o tu avatar, con una sola frase.
 * Abajo, lo que se configura una vez: género, cuerpo y semana.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ComfortTape } from '../components/ComfortTape.jsx';
import { Mannequin } from '../components/Mannequin.jsx';
import { OutfitReveal } from '../components/OutfitReveal.jsx';
import { Button, Chip, Icon, NumberField, Segmented } from '../components/ui.jsx';
import { WeatherCard } from '../components/WeatherCard.jsx';
import { COMFORT_LEVELS, OCCASIONS } from '../data/seed.js';
import { suggestOutfits } from '../engine/outfitEngine.js';
import { GENDERS } from '../lib/gender.js';
import { lastDays } from '../lib/utils.js';
import { isRainy, seasonFromWeather } from '../lib/weather.js';
import { usePhotoAlign } from '../lib/photoAlign.js';

export default function TodayScreen({
  profile, setProfile, comfort, setComfort, symptoms, setSymptoms, log, wardrobe, goTo, openScan, avatarDims,
  weather, plan, setPlan, isPremium, requestPremium, bodyPhoto, genderCfg, changeGender, onTryOn,
}) {
  const [reveal, setReveal] = useState(null); // { outfits, idx, weather }
  const [generating, setGenerating] = useState(false);
  const revealRef = useRef(null);
  const days = lastDays(7);
  const { align } = usePhotoAlign(bodyPhoto); // mismo ajuste que en el probador

  /** Cruza clima + ropa + comodidad + cuerpo y arma las opciones. */
  const compute = useCallback((w) => {
    const season = w ? seasonFromWeather(w) : plan.season;
    if (season !== plan.season) setPlan((p) => ({ ...p, season }));
    const ctx = {
      comfort, symptoms, occasion: plan.occasion, season, rain: isRainy(w),
      bodyShape: profile.bodyShape, shapeTip: genderCfg.shapeInfo(profile.bodyShape).tip,
    };
    return { outfits: suggestOutfits(wardrobe, ctx, 5).outfits, idx: 0, weather: w };
  }, [comfort, symptoms, plan.occasion, plan.season, setPlan, profile.bodyShape, genderCfg, wardrobe]);

  async function generate() {
    setGenerating(true);
    let w = weather.weather;
    if (!w && weather.status !== 'denied') w = await weather.locate(); // un toque: pide ubicación si hace falta
    setReveal(compute(w));
    setGenerating(false);
    requestAnimationFrame(() => revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  // Si cambia la comodidad, la ocasión o la ropa con un outfit en pantalla, se actualiza solo.
  useEffect(() => {
    if (reveal) setReveal(compute(reveal.weather || weather.weather));
  }, [comfort, symptoms, plan.occasion, wardrobe]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = reveal?.outfits[reveal.idx];
  const photo = bodyPhoto && isPremium ? bodyPhoto : null;
  const another = () => {
    if (!isPremium) return requestPremium('Con Premium ves todas las combinaciones para hoy, no solo la primera.');
    setReveal((r) => ({ ...r, idx: (r.idx + 1) % r.outfits.length }));
  };
  const photoLocked = !photo ? () => (bodyPhoto ? requestPremium('Ver la ropa sobre tu foto es Premium.') : openScan('scan')) : null;

  return (
    <div className="space-y-6">
      {/* ── Lo de hoy, en una tarjeta ── */}
      <section className="panel space-y-5 p-5 sm:p-8" aria-labelledby="today-title">
        <h1 id="today-title" className="font-display text-[clamp(1.4rem,4vw,2.2rem)] font-semibold leading-tight tracking-tight">
          {profile.name ? `Hola, ${profile.name}.` : 'Hola.'} ¿Qué te ponés hoy?
        </h1>

        <WeatherCard weather={weather} />

        <button type="button" onClick={generate} disabled={generating}
          className="flex min-h-[5.5rem] w-full items-center justify-center gap-3 rounded-[22px] bg-accent px-6 font-display text-[clamp(1.4rem,4.5vw,1.9rem)] font-semibold text-accent-ink shadow-[0_10px_30px_-10px_var(--accent)] transition hover:brightness-110 active:scale-[.99] disabled:opacity-70">
          <Icon name="spark" className="h-8 w-8" /> {generating ? 'Armando tu outfit…' : reveal ? 'Generar de nuevo' : 'Generar outfit de hoy'}
        </button>
        <details className="group rounded-2xl border border-line">
          <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold">
            <span>Ajustes de hoy: <span className="font-normal text-muted">{OCCASIONS.find((o) => o.id === plan.occasion)?.label}, comodidad {comfort}</span></span>
            <span className="text-sm text-accent underline underline-offset-4 group-open:hidden">Cambiar</span>
          </summary>
          <div className="space-y-5 border-t border-line p-4">
            <div>
              <p className="mb-2 font-bold">¿Para qué?</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {OCCASIONS.map((o) => (
                  <span key={o.id} className="shrink-0"><Chip selected={plan.occasion === o.id} onClick={() => setPlan((p) => ({ ...p, occasion: o.id }))}>{o.label}</Chip></span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 font-bold">¿Cómo está tu cuerpo hoy?</p>
              <ComfortTape value={comfort} onChange={setComfort} compact id="comfort-today" />
            </div>
          </div>
        </details>
      </section>

      {/* ── Resultado ── */}
      <div ref={revealRef} className="scroll-mt-24">
        {reveal && (current ? (
          <OutfitReveal outfit={current} weather={reveal.weather} comfort={comfort} shapeId={profile.bodyShape} avatarDims={avatarDims}
            photo={photo} align={align} onPhotoLocked={photoLocked} canAnother={isPremium && reveal.outfits.length > 1} onAnother={another}
            onTryOn={() => onTryOn(current.pieces)} index={isPremium ? reveal.idx : 0} total={isPremium ? reveal.outfits.length : 1} />
        ) : (
          <section className="reveal panel space-y-4 p-6 text-center">
            <p className="font-display text-2xl font-semibold">Con tu ropa actual no llegamos a un outfit para hoy.</p>
            <p className="text-muted">Sumá algunas prendas para este clima, o probá con otra ocasión.</p>
            <Button size="lg" onClick={() => goTo('guardarropa')}><Icon name="camera" className="h-5 w-5" /> Sumar prendas</Button>
          </section>
        ))}
        {reveal && !profile.body && (
          <button type="button" onClick={() => openScan('scan')} className="mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--tape)] px-4 font-bold">
            <Icon name="body" className="h-5 w-5" /> Para verlo con tu cuerpo, escaneate en 1 minuto
          </button>
        )}
      </div>

      {/* ── Síntomas (según género) ── */}
      <section className="panel p-5 sm:p-7" aria-labelledby="symptoms-title">
        <h2 id="symptoms-title" className="font-bold">¿Te pasa algo de esto hoy? <span className="font-normal text-muted">(opcional)</span></h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {genderCfg.symptoms.map((s) => (
            <Chip key={s.id} selected={symptoms.includes(s.id)} onClick={() => setSymptoms((x) => (x.includes(s.id) ? x.filter((v) => v !== s.id) : [...x, s.id]))}>{s.label}</Chip>
          ))}
        </div>
      </section>

      {/* ── Vos y tu cuerpo ── */}
      <section className="panel p-5 sm:p-8" aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-display text-xl font-semibold">Vos y tu cuerpo</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-bold">Tu nombre</span>
            <input className="field" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Tu nombre o apodo" />
          </label>
          <div>
            <p className="mb-1.5 font-bold">Ropa y talles de</p>
            <Segmented label="Ropa y talles de" options={GENDERS} value={genderCfg.gender} onChange={changeGender} />
            <p className="mt-1.5 text-[0.88rem] text-muted">{GENDERS.find((g) => g.id === genderCfg.gender)?.hint}. Cambia las preguntas, las siluetas y las tablas de talles.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-sunk p-4 sm:flex-row sm:items-center">
          <Mannequin shapeId={profile.bodyShape} custom={avatarDims} className="mx-auto h-40 shrink-0 sm:mx-0" label="Tu avatar" />
          <div className="flex-1 space-y-3">
            <p className="font-display text-lg font-semibold">{profile.body ? 'Tu avatar tiene tus medidas' : 'Hacé tu avatar con tus medidas'}</p>
            <p className="text-muted">
              {profile.body
                ? `${profile.body.heightCm} cm. ${genderCfg.chestLabel} ${profile.body.measures.bust}, cintura ${profile.body.measures.waist}, cadera ${profile.body.measures.hip} cm.`
                : 'Con la cámara tarda 1 minuto y las fotos no salen de tu teléfono.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => openScan('scan')}><Icon name="camera" className="h-5 w-5" /> {profile.body ? 'Escanear de nuevo' : 'Escanear mi cuerpo'}</Button>
              <Button variant="secondary" onClick={() => openScan('manual')}>Escribir medidas</Button>
            </div>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-3 font-bold">{profile.body ? 'Tu silueta (calculada con tus medidas)' : 'O elegí la silueta más parecida'}</legend>
          <div className={`grid gap-2 ${genderCfg.shapes.length === 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'}`}>
            {genderCfg.shapes.map((s) => (
              <button key={s.id} type="button" aria-pressed={profile.bodyShape === s.id} onClick={() => setProfile((p) => ({ ...p, bodyShape: s.id }))}
                className={`rounded-2xl border-2 px-2 pb-3 pt-2 text-center transition-colors ${profile.bodyShape === s.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink'}`}>
                <Mannequin shapeId={s.id} custom={s.dims} className="mx-auto h-24" label={`Silueta ${s.label}`} />
                <span className="mt-1 block text-[0.85rem] font-bold leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{genderCfg.shapeInfo(profile.bodyShape).tip}</p>
        </fieldset>

        <div className="mt-6 max-w-[22rem]">
          <NumberField label="¿Cuánto se te hincha la cintura en un mal día?" value={profile.swellCm} max={30} onChange={(v) => setProfile((p) => ({ ...p, swellCm: v }))}
            hint="Si no sabés, dejá 4 cm. Lo usamos para avisarte si un talle te va a apretar." />
        </div>
      </section>

      {/* ── Semana ── */}
      <section className="panel p-5 sm:p-7" aria-labelledby="week-title">
        <h2 id="week-title" className="font-display text-xl font-semibold">Tu semana</h2>
        <ol className="mt-5 grid grid-cols-7 items-end gap-2" style={{ height: 110 }}>
          {days.map((d) => {
            const v = log[d.key];
            return (
              <li key={d.key} className="flex h-full flex-col items-center justify-end gap-2">
                <span className="sr-only">{d.label}: {v ? `nivel ${v}, ${COMFORT_LEVELS[v - 1].name}` : 'sin registro'}</span>
                <span aria-hidden="true" className="w-full max-w-9 rounded-md" style={{ height: v ? `${v * 16}px` : '10px', background: v ? (d.isToday ? 'var(--tape)' : 'var(--accent)') : 'transparent', border: v ? 'none' : '1.5px dashed var(--line)' }} />
                <span aria-hidden="true" className={`text-[0.78rem] capitalize ${d.isToday ? 'font-bold' : 'text-muted'}`}>{d.label}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
