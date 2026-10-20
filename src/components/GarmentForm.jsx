/**
 * Alta y edición de prendas del guardarropa.
 * Al subir una foto, se reduce de tamaño y se detecta su color dominante.
 */
import React, { useState } from 'react';
import { CATEGORIES, FABRICS, FITS, OCCASIONS, SEASONS, WAISTBANDS } from '../data/seed.js';
import { dominantColor, resizeImage, uid } from '../lib/utils.js';
import { guessFriendliness } from '../engine/outfitEngine.js';
import { GarmentThumb } from './Mannequin.jsx';
import { Button, Chip, Field, FriendDots, Icon, Segmented } from './ui.jsx';

const EMPTY = {
  name: '', category: 'top', shape: 'pantalon', color: '#7C8AA5', seasons: ['templado'], occasions: ['casual'],
  comfort: 3, waistband: 'NONE', fit: 'regular', fabric: 'Algodón', photo: null,
};

export function GarmentForm({ initial, onSave, onDelete, onCancel }) {
  const [g, setG] = useState(() => ({ ...EMPTY, ...initial }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !initial?.id;
  const set = (patch) => setG((x) => ({ ...x, ...patch }));
  const toggle = (key, id) => set({ [key]: g[key].includes(id) ? g[key].filter((v) => v !== id) : [...g[key], id] });

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const photo = await resizeImage(file, 360);
      set({ photo, color: await dominantColor(photo) });
    } catch {
      setError('No pudimos leer esa imagen. Probá con un JPG o PNG.');
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!g.name.trim()) return setError('Poné un nombre para reconocer la prenda.');
    if (!g.seasons.length || !g.occasions.length) return setError('Elegí al menos un clima y una ocasión.');
    onSave({ ...g, name: g.name.trim(), id: g.id || uid() });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="tag h-36 w-28 shrink-0"><GarmentThumb item={g} /></div>
        <div className="flex flex-col justify-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2.5 font-bold hover:border-ink focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)]">
            <Icon name="upload" /> {g.photo ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
          </label>
          <p className="text-sm text-muted">{busy ? 'Leyendo la foto…' : g.photo ? 'Detectamos el color de la foto; podés corregirlo abajo.' : 'Opcional. Si no subís foto, usamos el color.'}</p>
        </div>
      </div>

      <Field label="Nombre">
        <input className="field" value={g.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej.: Pantalón wide leg negro" />
      </Field>

      <Field as="div" label="Tipo de prenda">
        <Segmented label="Tipo de prenda" options={CATEGORIES} value={g.category} onChange={(category) => set({ category })} />
      </Field>
      {g.category === 'bottom' && (
        <Field as="div" label="Forma">
          <Segmented label="Forma" options={[{ id: 'pantalon', label: 'Pantalón o short' }, { id: 'falda', label: 'Falda' }]} value={g.shape} onChange={(shape) => set({ shape })} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Color (HEX)">
          <span className="flex gap-2">
            <input type="color" value={g.color} onChange={(e) => set({ color: e.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label="Elegir color" />
            <input className="field font-bold uppercase tabular-nums" value={g.color} maxLength={7}
              onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set({ color: e.target.value.toUpperCase() })} />
          </span>
        </Field>
        <Field label="Tela">
          <select className="field" value={g.fabric} onChange={(e) => set({ fabric: e.target.value })}>
            {FABRICS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
      </div>

      <Field as="div" label="Corte">
        <Segmented label="Corte" options={FITS} value={g.fit} onChange={(fit) => set({ fit, comfort: guessFriendliness({ fit, waistband: g.waistband }) })} />
      </Field>
      <Field as="div" label="Tipo de pretina">
        <Segmented label="Tipo de pretina" options={WAISTBANDS} value={g.waistband} onChange={(waistband) => set({ waistband, comfort: guessFriendliness({ fit: g.fit, waistband }) })} />
      </Field>

      <Field label="Amigabilidad ante la inflamación" hint="La estimamos según el corte y la pretina; ajustala si tu experiencia es otra.">
        <span className="flex items-center gap-4">
          <input type="range" min="1" max="5" value={g.comfort} onChange={(e) => set({ comfort: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-valuetext={`${g.comfort} de 5`} />
          <FriendDots value={g.comfort} />
        </span>
      </Field>

      <Field as="div" label="Clima">
        <div className="flex flex-wrap gap-2">{SEASONS.map((s) => <Chip key={s.id} selected={g.seasons.includes(s.id)} onClick={() => toggle('seasons', s.id)}>{s.label}</Chip>)}</div>
      </Field>
      <Field as="div" label="Ocasiones">
        <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <Chip key={o.id} selected={g.occasions.includes(o.id)} onClick={() => toggle('occasions', o.id)}>{o.label}</Chip>)}</div>
      </Field>

      {error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-bad">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {!isNew ? (
          confirmDelete
            ? <Button variant="danger" onClick={() => onDelete(g.id)}>Confirmar eliminación</Button>
            : <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Eliminar prenda</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={submit}>{isNew ? 'Agregar al guardarropa' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
