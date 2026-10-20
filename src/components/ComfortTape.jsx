/**
 * Control de "Nivel de inflamación / confort" con forma de cinta métrica.
 * Es un <input type="range"> nativo (accesible con teclado y lectores de pantalla)
 * con la cinta dibujada por debajo.
 */
import React from 'react';
import { COMFORT_LEVELS } from '../data/seed.js';

export function ComfortTape({ value, onChange, compact = false, id = 'comfort' }) {
  const lvl = COMFORT_LEVELS[value - 1];
  return (
    <div>
      <div className={`flex items-end justify-between gap-4 ${compact ? 'mb-3' : 'mb-5'}`}>
        <div className="min-w-0">
          <p id={`${id}-name`} className={`font-display font-semibold leading-none tracking-tight ${compact ? 'text-2xl' : 'text-[clamp(2rem,5vw,3rem)]'}`}>{lvl.name}</p>
          <p className={`mt-2 text-muted ${compact ? 'text-sm' : ''} max-w-[48ch]`} aria-live="polite">{lvl.hint}</p>
        </div>
        <p className={`font-display font-semibold tabular-nums leading-none ${compact ? 'text-4xl' : 'text-[clamp(3.2rem,9vw,5rem)]'}`} aria-hidden="true">
          {value}<span className="text-[0.4em] text-muted">/5</span>
        </p>
      </div>

      <div className={`tape ${compact ? 'tape--sm' : ''}`}>
        <div className="tape__ticks" aria-hidden="true" />
        {COMFORT_LEVELS.map((l, i) => (
          <span key={l.level} aria-hidden="true" className={`tape__num ${l.level === value ? 'is-on' : ''}`} style={{ left: `calc(var(--pad) + (100% - 2 * var(--pad)) * ${i / 4})` }}>
            {l.level}
          </span>
        ))}
        <input id={id} type="range" min="1" max="5" step="1" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tape__input" aria-label="Nivel de inflamación y confort"
          aria-valuetext={`${value} de 5: ${lvl.name}`} />
      </div>
      <div className="mt-2 flex justify-between text-[0.82rem] text-muted">
        <span>Ajustado y estructurado</span>
        <span className="text-right">Holgado, confort absoluto</span>
      </div>
    </div>
  );
}

/** Versión mínima para la barra superior: 5 botones. */
export function ComfortQuick({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted sm:inline">Confort hoy</span>
      <div role="radiogroup" aria-label="Nivel de confort de hoy" className="flex gap-1">
        {COMFORT_LEVELS.map((l) => (
          <button key={l.level} type="button" role="radio" aria-checked={value === l.level} title={l.name}
            onClick={() => onChange(l.level)}
            className={`h-8 w-8 rounded-lg text-sm font-bold tabular-nums transition-colors ${value === l.level ? 'bg-tape text-tape-ink' : 'bg-sunk text-muted hover:text-ink'}`}>
            {l.level}
          </button>
        ))}
      </div>
    </div>
  );
}
