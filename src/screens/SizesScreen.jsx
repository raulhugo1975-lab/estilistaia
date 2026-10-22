/**
 * Módulo 5 · Traductor y comparador de talles internacional.
 * Argentina, Shein, Temu, USA y Europa, con semáforo para días de inflamación.
 */
import React, { useState } from 'react';
import { NumberField, Segmented } from '../components/ui.jsx';
import { SIZE_CHARTS } from '../data/seed.js';
import { FABRIC_OPTIONS, recommendSizes, swollenMeasures } from '../engine/sizeEngine.js';

const LIGHT = {
  ok: { label: 'Verde', color: 'var(--ok)', soft: 'var(--ok-soft)' },
  warn: { label: 'Amarillo', color: 'var(--warn)', soft: 'var(--warn-soft)' },
  bad: { label: 'Rojo', color: 'var(--bad)', soft: 'var(--bad-soft)' },
};

/** Semáforo vertical: la luz encendida + su nombre en texto (no depende solo del color). */
function TrafficLight({ status }) {
  return (
    <span className="flex w-28 shrink-0 items-center gap-2.5">
      <span className="flex flex-col gap-1 rounded-full bg-ink p-1.5" aria-hidden="true">
        {['bad', 'warn', 'ok'].map((s) => (
          <span key={s} className="h-3.5 w-3.5 rounded-full" style={{ background: s === status ? LIGHT[s].color : 'var(--muted)', opacity: s === status ? 1 : 0.35, boxShadow: s === status ? `0 0 0 3px ${LIGHT[s].soft}` : 'none' }} />
        ))}
      </span>
      <span className="text-sm font-bold" style={{ color: LIGHT[status].color }}>{LIGHT[status].label}</span>
    </span>
  );
}

const fmt = (n) => String(n).replace('.', ',');

export default function SizesScreen({ profile, setProfile, comfort, genderCfg }) {
  const [fabric, setFabric] = useState('rigida');
  const [chartBrand, setChartBrand] = useState('Shein');
  const cut = genderCfg.sizeCut || profile.sizeCut; // femenino y masculino: tabla fija; neutro: elige
  const m = profile.measures;
  const today = swollenMeasures(m, comfort, profile.swellCm);
  const rows = recommendSizes({ measures: m, cut, fabric, comfort, swellCm: profile.swellCm });
  const updateMeasure = (k, v) => setProfile((p) => ({ ...p, measures: { ...p.measures, [k]: v } }));
  const chartRow = rows.find((r) => r.brand === chartBrand);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-tight">Traductor de talles</h1>
        <p className="mt-1 max-w-[62ch] text-muted">Ingresá tus medidas del cuerpo. Te decimos qué talle pedir en cada marca y si va a apretar en un día de inflamación.</p>
      </header>

      <section className="panel space-y-6 p-5 sm:p-7" aria-label="Tus medidas">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField label={genderCfg.chestLabel} value={m.bust} onChange={(v) => updateMeasure('bust', v)} />
          <NumberField label="Cintura" value={m.waist} onChange={(v) => updateMeasure('waist', v)} />
          <NumberField label="Cadera" value={m.hip} onChange={(v) => updateMeasure('hip', v)} />
          <NumberField label="Variación en tu peor día" value={profile.swellCm} max={30} onChange={(v) => setProfile((p) => ({ ...p, swellCm: v }))} />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {genderCfg.sizeCut ? (
            <div>
              <p className="mb-2 text-sm font-bold">Tabla de la marca</p>
              <p className="flex min-h-[2.75rem] items-center rounded-xl bg-sunk px-4 font-bold">{cut === 'masculino' ? 'Talles de hombre' : 'Talles de mujer'}</p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-bold">Tabla de la marca</p>
              <Segmented label="Tabla de la marca" value={cut} onChange={(sizeCut) => setProfile((p) => ({ ...p, sizeCut }))}
                options={[{ id: 'femenino', label: 'Talles de mujer' }, { id: 'masculino', label: 'Talles de hombre' }]} />
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-bold">Tipo de prenda</p>
            <Segmented label="Tipo de prenda" value={fabric} onChange={setFabric} options={FABRIC_OPTIONS} />
          </div>
        </div>
        <p className="rounded-xl bg-sunk px-4 py-3 text-[0.95rem]">
          Con tu nivel {comfort} de hoy calculamos <b>cintura {fmt(today.waist)} cm</b> y <b>cadera {fmt(today.hip)} cm</b>
          {comfort === 1 ? ' (sin variación).' : `, sobre ${fmt(m.waist)} y ${fmt(m.hip)} cm de un día normal.`}
        </p>
      </section>

      <section aria-labelledby="results-title">
        <h2 id="results-title" className="sr-only">Resultados por marca</h2>
        <ul className="panel divide-y divide-[var(--line)]">
          {rows.map((r) => (
            <li key={r.brand} className="grid gap-3 p-5 sm:grid-cols-[8rem_7.5rem_7.5rem_minmax(0,1fr)] sm:items-center sm:gap-5">
              <p className="font-display text-xl font-semibold">{r.brand}</p>
              <div><p className="text-[0.78rem] text-muted">Día normal</p><p className="font-display text-xl font-semibold">{r.base ?? '—'}</p></div>
              <div><p className="text-[0.78rem] text-muted">Hoy</p><p className="font-display text-xl font-semibold">{r.today ?? '—'}</p></div>
              <div className="flex items-start gap-4">
                <TrafficLight status={r.status} />
                <p className="text-[0.95rem]">{r.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-5 sm:p-7" aria-labelledby="chart-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chart-title" className="font-display text-lg font-semibold">Tabla de referencia</h2>
          <Segmented label="Marca" size="sm" value={chartBrand} onChange={setChartBrand} options={Object.keys(SIZE_CHARTS[cut]).map((b) => ({ id: b, label: b }))} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left tabular-nums">
            <thead className="text-sm text-muted">
              <tr><th className="py-2 pr-4 font-bold">Talle</th><th className="py-2 pr-4 font-bold">{cut === 'masculino' ? 'Pecho' : 'Busto'}</th><th className="py-2 pr-4 font-bold">Cintura</th><th className="py-2 font-bold">Cadera</th></tr>
            </thead>
            <tbody>
              {SIZE_CHARTS[cut][chartBrand].map((row) => {
                const isBase = row.size === chartRow?.base, isToday = row.size === chartRow?.today;
                return (
                  <tr key={row.size} className="border-t border-line" style={{ background: isToday ? 'var(--tape)' : isBase ? 'var(--accent-soft)' : undefined, color: isToday ? 'var(--tape-ink)' : undefined }}>
                    <td className="py-2.5 pl-2 pr-4 font-bold">{row.size}{isToday ? ' (hoy)' : isBase ? ' (día normal)' : ''}</td>
                    <td className="py-2.5 pr-4">{row.bust} cm</td><td className="py-2.5 pr-4">{row.waist} cm</td><td className="py-2.5">{row.hip} cm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">Valores de referencia promediados. Cada producto de Shein o Temu tiene su propia tabla: chequeala antes de comprar, sobre todo en prendas sin elastano.</p>
      </section>
    </div>
  );
}
