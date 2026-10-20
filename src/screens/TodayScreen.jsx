/**
 * Módulo 1 · Perfil y estado físico diario.
 * La cinta de confort es el control central de toda la app.
 */
import React from 'react';
import { ComfortTape } from '../components/ComfortTape.jsx';
import { Mannequin } from '../components/Mannequin.jsx';
import { Button, Chip, Field, NumberField, Segmented } from '../components/ui.jsx';
import { BODY_SHAPES, COMFORT_LEVELS, STYLES, SYMPTOMS } from '../data/seed.js';
import { checkGarment } from '../engine/outfitEngine.js';
import { lastDays } from '../lib/utils.js';

export default function TodayScreen({ profile, setProfile, comfort, setComfort, symptoms, setSymptoms, log, wardrobe, goTo }) {
  const blocked = wardrobe.map((item) => ({ item, ...checkGarment(item, { comfort, symptoms }) })).filter((r) => !r.ok);
  const toggleSymptom = (id) => setSymptoms((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const update = (patch) => setProfile((p) => ({ ...p, ...patch }));
  const updateMeasure = (k, v) => setProfile((p) => ({ ...p, measures: { ...p.measures, [k]: v } }));
  const days = lastDays(7);

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-8" aria-labelledby="today-title">
        <h1 id="today-title" className="max-w-[22ch] font-display text-[clamp(1.75rem,4.2vw,2.6rem)] font-semibold leading-[1.08] tracking-tight">
          {profile.name ? `Hola, ${profile.name}. ` : ''}¿Cómo está tu cuerpo hoy?
        </h1>
        <p className="mt-3 max-w-[60ch] text-muted">Mové la cinta: las sugerencias, el probador y los talles se ajustan a este nivel.</p>
        <div className="mt-8"><ComfortTape value={comfort} onChange={setComfort} /></div>

        <fieldset className="mt-8">
          <legend className="mb-3 font-bold">¿Algo más que tengamos en cuenta?</legend>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => <Chip key={s.id} selected={symptoms.includes(s.id)} onClick={() => toggleSymptom(s.id)}>{s.label}</Chip>)}
          </div>
        </fieldset>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section className="panel p-5 sm:p-7" aria-labelledby="changes-title">
          <h2 id="changes-title" className="font-display text-xl font-semibold">Lo que cambia hoy</h2>
          {blocked.length === 0 ? (
            <p className="mt-3 text-muted">Todo tu guardarropa está disponible en este nivel.</p>
          ) : (
            <>
              <p className="mt-2 text-muted">Dejamos fuera {blocked.length} {blocked.length === 1 ? 'prenda' : 'prendas'} de {wardrobe.length}:</p>
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {blocked.slice(0, 5).map(({ item, reasons }) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    <span className="mt-1 h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: item.color }} aria-hidden="true" />
                    <span><span className="font-bold">{item.name}.</span> <span className="text-muted">{reasons[0]}</span></span>
                  </li>
                ))}
              </ul>
              {blocked.length > 5 && <p className="text-sm text-muted">Y {blocked.length - 5} más.</p>}
            </>
          )}
          <Button className="mt-5" onClick={() => goTo('outfits')}>Ver outfits de hoy</Button>
        </section>

        <section className="panel p-5 sm:p-7" aria-labelledby="week-title">
          <h2 id="week-title" className="font-display text-xl font-semibold">Tu semana</h2>
          <p className="mt-1 text-sm text-muted">Guardamos el nivel de cada día para ver cómo cambia tu cuerpo.</p>
          <ol className="mt-6 grid grid-cols-7 items-end gap-2" style={{ height: 120 }}>
            {days.map((d) => {
              const v = log[d.key];
              const name = v ? COMFORT_LEVELS[v - 1].name : 'sin registro';
              return (
                <li key={d.key} className="flex h-full flex-col items-center justify-end gap-2">
                  <span className="sr-only">{d.label}: {v ? `nivel ${v}, ${name}` : name}</span>
                  <span aria-hidden="true" className="w-full max-w-9 rounded-md"
                    style={{ height: v ? `${v * 18}px` : '10px', background: v ? (d.isToday ? 'var(--tape)' : 'var(--accent)') : 'transparent', border: v ? 'none' : '1.5px dashed var(--line)', transition: 'height .3s ease' }} />
                  <span aria-hidden="true" className={`text-[0.78rem] capitalize ${d.isToday ? 'font-bold' : 'text-muted'}`}>{d.label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="panel p-5 sm:p-8" aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-display text-xl font-semibold">Perfil y fisionomía</h2>
        <p className="mt-1 max-w-[60ch] text-muted">Las sugerencias funcionan para cualquier género. El estilo solo define qué tabla de talles mostramos primero.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="¿Cómo te llamamos?">
            <input className="field" value={profile.name} onChange={(e) => update({ name: e.target.value })} placeholder="Tu nombre o apodo" />
          </Field>
          <Field as="div" label="Estilo con el que te identificás">
            <Segmented label="Estilo" options={STYLES} value={profile.style}
              onChange={(style) => update({ style, sizeCut: style === 'masculino' ? 'masculino' : style === 'femenino' ? 'femenino' : profile.sizeCut })} />
          </Field>
        </div>

        <fieldset className="mt-7">
          <legend className="mb-3 font-bold">Tu silueta</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {BODY_SHAPES.map((s) => (
              <button key={s.id} type="button" aria-pressed={profile.bodyShape === s.id} onClick={() => update({ bodyShape: s.id })}
                className={`rounded-2xl border px-2 pb-3 pt-2 text-center transition-colors ${profile.bodyShape === s.id ? 'border-ink bg-sunk' : 'border-line hover:border-ink'}`}>
                <Mannequin shapeId={s.id} className="mx-auto h-28" label={`Silueta ${s.label}`} />
                <span className="mt-1 block text-[0.85rem] font-bold leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{BODY_SHAPES.find((s) => s.id === profile.bodyShape)?.tip}</p>
        </fieldset>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField label="Busto o pecho" value={profile.measures.bust} onChange={(v) => updateMeasure('bust', v)} />
          <NumberField label="Cintura" value={profile.measures.waist} onChange={(v) => updateMeasure('waist', v)} />
          <NumberField label="Cadera" value={profile.measures.hip} onChange={(v) => updateMeasure('hip', v)} />
          <NumberField label="Variación en tu peor día" value={profile.swellCm} max={30} onChange={(v) => update({ swellCm: v })} hint="Cuánto crece tu cintura." />
        </div>
      </section>
    </div>
  );
}
