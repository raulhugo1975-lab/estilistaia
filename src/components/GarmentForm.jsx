/**
 * Agregar o editar una prenda, en pocas decisiones:
 *   1. Foto (cámara directa o galería)  2. ¿Qué es?  3. ¿Cómo cierra en la cintura?  4. ¿Cómo te queda?
 * Todo lo demás (color, tela, clima, ocasiones) tiene valores por defecto
 * y queda plegado en "Más detalles".
 */
import React, { useState } from 'react';
import { CATEGORIES, FABRICS, OCCASIONS, SEASONS } from '../data/seed.js'; // CATEGORIES: nombre automático
import { colorName, dominantColor, resizeImage, uid } from '../lib/utils.js';
import { guessFriendliness } from '../engine/outfitEngine.js';
import { getGenderConfig } from '../lib/gender.js';
import { GarmentThumb } from './Mannequin.jsx';
import { PhotoPicker } from './PhotoPicker.jsx';
import { Button, Chip, Field, FriendDots, Icon } from './ui.jsx';

const EMPTY = {
  name: '', category: 'top', shape: 'pantalon', color: '#7C8AA5',
  seasons: ['calido', 'templado', 'frio'], occasions: ['casa', 'casual', 'trabajo'],
  comfort: 3, waistband: 'NONE', fit: 'regular', fabric: 'Algodón', photo: null,
};

/** Opciones con palabras de todos los días y una ayuda corta. */
const WAIST_OPTIONS = [
  { id: 'ELASTIC_BAND', label: 'Elástico', help: 'Se estira solo' },
  { id: 'DRAWSTRING', label: 'Con cordón', help: 'Lo ajustás vos' },
  { id: 'RIGID_BUTTON', label: 'Botón y cierre', help: 'Como un jean' },
];
const FIT_OPTIONS = [
  { id: 'ajustado', label: 'Ajustada', help: 'Pegada al cuerpo' },
  { id: 'regular', label: 'Normal', help: 'Ni suelta ni pegada' },
  { id: 'holgado', label: 'Suelta', help: 'Con espacio' },
];
const hasWaist = (cat) => cat === 'bottom' || cat === 'dress';

/** Grupo de botones grandes con título y ayuda (radio accesible). */
function BigChoice({ label, options, value, onChange, cols = 3 }) {
  return (
    <fieldset>
      <legend className="mb-2 font-display text-lg font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} className={`grid gap-2 ${cols === 5 ? 'grid-cols-3 sm:grid-cols-5' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
            className={`min-h-[3.5rem] rounded-2xl border-2 px-2 py-2 text-center transition-colors ${value === o.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink'}`}>
            <span className="block font-bold leading-tight">{o.label}</span>
            {o.help && <span className="mt-0.5 block text-[0.8rem] text-muted">{o.help}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function GarmentForm({ initial, onSave, onDelete, onCancel, style }) {
  const [g, setG] = useState(() => ({ ...EMPTY, ...initial }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !initial?.id;
  const gcfg = getGenderConfig(style, initial?.category);
  const set = (patch) => setG((x) => {
    const next = { ...x, ...patch };
    if (!hasWaist(next.category)) next.waistband = 'NONE';
    else if (next.waistband === 'NONE') next.waistband = 'ELASTIC_BAND';
    if ('fit' in patch || 'waistband' in patch || 'category' in patch) next.comfort = guessFriendliness(next);
    return next;
  });
  const toggle = (key, id) => set({ [key]: g[key].includes(id) ? g[key].filter((v) => v !== id) : [...g[key], id] });
  const autoName = `${CATEGORIES.find((c) => c.id === g.category)?.long} ${colorName(g.color)}`;

  async function onPhoto(file) {
    setBusy(true);
    setError('');
    try {
      const photo = await resizeImage(file, 360);
      set({ photo, color: await dominantColor(photo) });
    } catch {
      setError('No pudimos abrir esa foto. Probá con otra.');
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!g.seasons.length || !g.occasions.length) {
      setMoreOpen(true);
      return setError('Elegí al menos un clima y una ocasión en "Más detalles".');
    }
    onSave({ ...g, example: false, name: g.name.trim() || autoName, id: g.id || uid() });
  }

  return (
    <div className="space-y-6">
      {/* 1. Foto */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="tag mx-auto h-44 w-36 shrink-0 sm:mx-0"><GarmentThumb item={g} /></div>
        <div className="flex-1 space-y-2">
          <PhotoPicker onPick={onPhoto} cameraLabel={g.photo ? 'Sacar otra foto' : 'Sacar foto'} stacked />
          <p className="text-[0.92rem] text-muted" aria-live="polite">
            {busy ? 'Leyendo la foto…' : g.photo ? 'Listo. Tomamos el color de la foto.' : 'Poné la prenda sobre una superficie lisa, con buena luz.'}
          </p>
        </div>
      </div>

      {/* 2. Tipo */}
      <BigChoice label="¿Qué es?" cols={gcfg.categories.length} value={g.category} onChange={(category) => set({ category })}
        options={gcfg.categories.map((c) => ({ id: c.id, label: c.label }))} />
      {g.category === 'bottom' && (
        <BigChoice label={gcfg.gender === 'masculino' ? '¿Largo o corto?' : '¿Pantalón o falda?'} value={g.shape} onChange={(shape) => set({ shape })}
          options={gcfg.bottomShapes} />
      )}

      {/* 3. Cintura (solo si tiene) */}
      {hasWaist(g.category) && (
        <BigChoice label="¿Cómo cierra en la cintura?" value={g.waistband} onChange={(waistband) => set({ waistband })} options={WAIST_OPTIONS} />
      )}

      {/* 4. Calce */}
      <BigChoice label="¿Cómo te queda?" value={g.fit} onChange={(fit) => set({ fit })} options={FIT_OPTIONS} />

      <Field label="Nombre (opcional)">
        <input className="field" value={g.name} onChange={(e) => setG((x) => ({ ...x, name: e.target.value }))} placeholder={autoName} />
      </Field>

      <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-sunk px-4 py-3 text-[0.95rem]">
        Comodidad en días de hinchazón: <FriendDots value={g.comfort} />
        <span className="text-muted">{g.comfort >= 4 ? 'muy cómoda' : g.comfort === 3 ? 'intermedia' : 'mejor para días livianos'}</span>
      </p>

      {/* Más detalles */}
      <div className="rounded-2xl border border-line">
        <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}
          className="flex min-h-[3rem] w-full items-center justify-between px-4 font-bold">
          Más detalles (opcional)
          <span aria-hidden="true" className={`transition-transform ${moreOpen ? 'rotate-90' : ''}`}><Icon name="arrow" className="h-5 w-5" /></span>
        </button>
        {moreOpen && (
          <div className="space-y-5 border-t border-line p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Color">
                <span className="flex gap-2">
                  <input type="color" value={g.color} onChange={(e) => set({ color: e.target.value.toUpperCase() })} className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-surface p-1" aria-label="Elegir color" />
                  <input className="field font-bold uppercase" value={g.color} maxLength={7}
                    onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setG((x) => ({ ...x, color: e.target.value.toUpperCase() }))} aria-label="Color en código HEX" />
                </span>
              </Field>
              <Field label="Tela">
                <select className="field" value={g.fabric} onChange={(e) => set({ fabric: e.target.value })}>
                  {FABRICS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
            </div>
            <Field as="div" label="¿Para qué clima?">
              <div className="flex flex-wrap gap-2">{SEASONS.map((s) => <Chip key={s.id} selected={g.seasons.includes(s.id)} onClick={() => toggle('seasons', s.id)}>{s.label}</Chip>)}</div>
            </Field>
            <Field as="div" label="¿Cuándo la usás?">
              <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <Chip key={o.id} selected={g.occasions.includes(o.id)} onClick={() => toggle('occasions', o.id)}>{o.label}</Chip>)}</div>
            </Field>
            <Field label="Comodidad en días de hinchazón" hint="La calculamos por el cierre y el calce. Cambiala si con esta prenda te pasa otra cosa.">
              <span className="flex items-center gap-4">
                <input type="range" min="1" max="5" value={g.comfort} onChange={(e) => set({ comfort: Number(e.target.value) })} className="h-8 w-full accent-[var(--accent)]" aria-valuetext={`${g.comfort} de 5`} />
                <FriendDots value={g.comfort} />
              </span>
            </Field>
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-bad">{error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {!isNew ? (
          confirmDelete
            ? <Button variant="danger" onClick={() => onDelete(g.id)}>Sí, eliminar</Button>
            : <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Eliminar prenda</Button>
        ) : <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button size="lg" onClick={submit} disabled={busy}><Icon name="check" className="h-6 w-6" /> {isNew ? 'Guardar prenda' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}
