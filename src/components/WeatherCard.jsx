/**
 * Clima del día en la pantalla principal: ícono grande, temperatura y una línea.
 * Sin ubicación: un botón para detectarla o un buscador de ciudad.
 */
import React, { useState } from 'react';
import { describeWeather, searchCity } from '../lib/weather.js';
import { Button, Icon } from './ui.jsx';

/** Íconos del clima dibujados en SVG (sin imágenes externas). */
export function WeatherIcon({ icon, className = 'h-16 w-16' }) {
  const sun = <><circle cx="24" cy="24" r="9" fill="var(--tape)" /><g stroke="var(--tape)" strokeWidth="3" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="24" y1="5" x2="24" y2="9" transform={`rotate(${a} 24 24)`} />)}</g></>;
  const cloud = (y = 0, fill = 'var(--muted)') => <path d={`M14 ${36 + y}h22a7 7 0 0 0 0-14 10 10 0 0 0-19-2 8 8 0 0 0-3 16z`} fill={fill} opacity=".9" />;
  const drops = <g stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"><line x1="17" y1="40" x2="15" y2="45" /><line x1="25" y1="40" x2="23" y2="45" /><line x1="33" y1="40" x2="31" y2="45" /></g>;
  const art = {
    sun,
    partly: <><g transform="translate(-6 -6) scale(.8)">{sun}</g>{cloud(2)}</>,
    cloud: cloud(-2),
    fog: <>{cloud(-6)}<g stroke="var(--muted)" strokeWidth="3" strokeLinecap="round"><line x1="10" y1="38" x2="38" y2="38" /><line x1="14" y1="44" x2="34" y2="44" /></g></>,
    rain: <>{cloud(-4)}{drops}</>,
    snow: <>{cloud(-4)}<g fill="var(--accent)"><circle cx="16" cy="42" r="2.2" /><circle cx="24" cy="45" r="2.2" /><circle cx="32" cy="42" r="2.2" /></g></>,
    storm: <>{cloud(-4, 'var(--ink)')}<path d="M25 33l-5 8h5l-3 7 8-10h-5l3-5z" fill="var(--tape)" /></>,
  };
  return <svg viewBox="0 0 48 48" className={className} aria-hidden="true">{art[icon] || art.partly}</svg>;
}

function CitySearch({ onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { setResults(await searchCity(q)); } catch { setResults([]); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Escribí tu ciudad" aria-label="Tu ciudad" />
        <Button onClick={go} disabled={busy || q.trim().length < 2}>{busy ? '…' : 'Buscar'}</Button>
      </div>
      {results && (results.length ? (
        <ul className="divide-y divide-[var(--line)] rounded-xl border border-line">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onClick={() => onPick(r)} className="min-h-[3rem] w-full px-4 py-2 text-left hover:bg-sunk">
                <b>{r.name}</b> <span className="text-muted">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No encontramos esa ciudad. Probá con otro nombre.</p>)}
    </div>
  );
}

export function WeatherCard({ weather: w }) {
  const { weather, place, status, locate, setCity } = w;
  const [changing, setChanging] = useState(false);

  if (weather && !changing) {
    const d = describeWeather(weather.code);
    return (
      <div className="flex items-center gap-4" aria-live="polite">
        <WeatherIcon icon={d.icon} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-5xl font-semibold leading-none tabular-nums">{weather.temp}°</p>
          <p className="mt-1 font-bold">{d.label}{place ? ` en ${place}` : ''}</p>
          <p className="text-[0.95rem] text-muted">
            Máx {weather.max}°, mín {weather.min}°{weather.feels !== weather.temp ? `. Sensación ${weather.feels}°` : ''}
            {weather.rainProb >= 50 ? `. ${weather.rainProb}% de lluvia` : ''}
          </p>
        </div>
        <button type="button" onClick={() => setChanging(true)} className="min-h-[2.75rem] self-start text-sm font-bold text-accent underline underline-offset-4">Cambiar</button>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <WeatherIcon icon="partly" className="h-12 w-12" />
        <p className="font-bold">
          {status === 'locating' || status === 'loading' ? 'Buscando el clima de tu zona…'
            : status === 'denied' ? 'No pudimos usar tu ubicación. Escribí tu ciudad:'
              : status === 'error' ? 'No pudimos traer el clima. Probá de nuevo o escribí tu ciudad.'
                : 'Elegimos la ropa según el clima de hoy.'}
        </p>
      </div>
      {status !== 'denied' && (
        <Button className="w-full sm:w-auto" onClick={async () => { if (await locate()) setChanging(false); }} disabled={status === 'locating' || status === 'loading'}>
          <Icon name="pin" className="h-5 w-5" /> Usar mi ubicación
        </Button>
      )}
      <CitySearch onPick={async (c) => { await setCity(c); setChanging(false); }} />
      {changing && <button type="button" onClick={() => setChanging(false)} className="text-sm font-bold text-muted underline">Cancelar</button>}
    </div>
  );
}
