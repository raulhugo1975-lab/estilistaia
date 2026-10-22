/**
 * Módulo 3 · Motor de sugerencia de outfits (vista).
 * Muestra la regla de ergonomía aplicada y las prendas descartadas con su motivo.
 */
import React from 'react';
import { Mannequin } from '../components/Mannequin.jsx';
import { Locked } from '../components/Premium.jsx';
import { FREE_LIMITS } from '../lib/premium.js';
import { Badge, Button, Chip, Icon, Segmented, ShopLinks } from '../components/ui.jsx';
import { COMFORT_LEVELS, OCCASIONS, SEASONS } from '../data/seed.js';
import { SLOTS } from '../engine/outfitEngine.js';
import { shopLinks } from '../lib/utils.js';

export default function OutfitsScreen({ plan, setPlan, result, comfort, symptoms, profile, onTryOn, isPremium, requestPremium, avatarDims, weather }) {
  const ergonomic = comfort >= 3;
  const occasion = OCCASIONS.find((o) => o.id === plan.occasion)?.label.toLowerCase();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-tight">Tus outfits de hoy</h1>
        <p className="mt-1 text-muted">Elegí para qué es y el clima. Los armamos con tu ropa y tu comodidad de hoy ({COMFORT_LEVELS[comfort - 1].name.toLowerCase()}).</p>
      </header>

      <section className="panel space-y-4 p-5 sm:p-6" aria-label="Ocasión y clima">
        <div>
          <p className="mb-2 font-display text-lg font-semibold">¿Para qué es?</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => <Chip key={o.id} selected={plan.occasion === o.id} onClick={() => setPlan((p) => ({ ...p, occasion: o.id }))}>{o.label}</Chip>)}
          </div>
        </div>
        <div>
          <p className="mb-2 font-display text-lg font-semibold">¿Qué clima hace?{weather?.weather && <span className="ml-2 text-base font-normal text-muted">Automático: {weather.weather.temp}° {weather.place ? `en ${weather.place}` : ''}</span>}</p>
          <Segmented label="Clima" options={SEASONS} value={plan.season} onChange={(season) => setPlan((p) => ({ ...p, season }))} />
        </div>
      </section>

      {(ergonomic || result.discarded.length > 0) && (
        <section className="rounded-[22px] border-2 border-dashed p-5 sm:p-6" style={{ borderColor: ergonomic ? 'var(--tape)' : 'var(--line)' }} aria-labelledby="rule-title">
          <h2 id="rule-title" className="font-display text-lg font-semibold">
            {ergonomic ? 'Dejamos afuera lo que aprieta' : 'Ajustes por cómo te sentís'}
          </h2>
          <p className="mt-1 max-w-[70ch] text-muted">
            {ergonomic
              ? 'Hoy tu cuerpo pide comodidad: no te sugerimos prendas con botón y cierre ni cortes pegados en la cintura. Priorizamos elásticos y telas sueltas.'
              : 'Algunos síntomas que marcaste dejan prendas fuera, aunque tu nivel sea bajo.'}
          </p>
          {result.discarded.length > 0 ? (
            <ul className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
              {result.discarded.map(({ item, reasons }) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: item.color }} aria-hidden="true" />
                  <span><span className="font-bold line-through decoration-[var(--bad)] decoration-2">{item.name}</span><br /><span className="text-[0.92rem] text-muted">{reasons.join(' ')}</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Para {occasion} no había prendas rígidas que descartar.</p>
          )}
        </section>
      )}

      {result.outfits.length === 0 ? (
        <section className="panel p-6 sm:p-8">
          <p className="font-display text-xl font-semibold">No encontramos combinaciones aptas para {occasion} con este clima.</p>
          <p className="mt-2 text-muted">Probá otra ocasión, sumá prendas al guardarropa o mirá qué te falta abajo.</p>
        </section>
      ) : (
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {result.outfits.map((o, i) => {
            const pieces = SLOTS.map((s) => o.pieces[s]).filter(Boolean);
            // Versión gratuita: solo la primera sugerencia; el resto queda bloqueado.
            const locked = !isPremium && i >= FREE_LIMITS.outfits;
            return (
              <li key={o.id} className="panel flex flex-col overflow-hidden">
                <Locked locked={locked} className="flex flex-1 flex-col" title={`Opción ${i + 1} con Premium`} text="Sugerencias ilimitadas para cada ocasión."
                  onUnlock={() => requestPremium('Con Premium ves todas las combinaciones que arma el motor, no solo la primera.')}>
                <div className="flex flex-1 flex-col">
                <div className="flex items-start gap-3 bg-sunk px-4 pt-4">
                  <Mannequin shapeId={profile.bodyShape} comfort={comfort} pieces={o.pieces} custom={avatarDims} className="h-60 w-auto shrink-0" />
                  <div className="ml-auto pt-1 text-right">
                    <p className="text-sm text-muted">Opción {i + 1}</p>
                    <p className="font-display text-4xl font-semibold tabular-nums">{o.score}<span className="text-base text-muted">%</span></p>
                    <p className="text-[0.8rem] text-muted">afinidad</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <ul className="space-y-1.5">
                    {pieces.map((p) => (
                      <li key={p.id} className="flex items-center gap-2.5">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" style={{ background: p.color }} aria-hidden="true" />
                        <span>{p.name}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1.5 border-t border-line pt-4 text-[0.92rem] text-muted">
                    {o.notes.map((n) => <li key={n} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{n}</li>)}
                  </ul>
                  <Button variant="secondary" className="mt-auto" onClick={() => onTryOn(o.pieces)}><Icon name="mirror" /> Probar en el probador</Button>
                </div>
                </div>
                </Locked>
              </li>
            );
          })}
        </ol>
      )}

      {result.gaps.length > 0 && (
        <section className="panel p-5 sm:p-6" aria-labelledby="gaps-title">
          <h2 id="gaps-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Icon name="bag" /> Te falta para días como hoy</h2>
          <ul className="mt-4 space-y-4">
            {result.gaps.map((g) => (
              <li key={g.label}>
                <p className="mb-2 font-bold">{g.label} <Badge tone="warn" className="ml-1">Sugerido</Badge></p>
                <ShopLinks links={shopLinks(g.query)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {symptoms.length > 0 && <p className="text-sm text-muted">También tuvimos en cuenta: {symptoms.length} {symptoms.length === 1 ? 'síntoma marcado' : 'síntomas marcados'} en Hoy.</p>}
    </div>
  );
}
