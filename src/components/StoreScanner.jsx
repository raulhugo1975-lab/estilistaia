/**
 * Escanear prenda en tienda.
 * Sacás una foto rápida → detectamos el color → la cruzamos con tu
 * guardarropa y con tu historial de inflamación antes de comprarla.
 */
import React, { useMemo, useState } from 'react';
import { CATEGORIES, FITS, WAISTBANDS } from '../data/seed.js';
import { colorName, dominantColor, resizeImage, shopLinks, uid } from '../lib/utils.js';
import { analyzeStoreItem } from '../engine/outfitEngine.js';
import { GarmentThumb } from './Mannequin.jsx';
import { PhotoPicker } from './PhotoPicker.jsx';
import { Badge, Button, Field, FriendDots, Icon, Segmented, ShopLinks } from './ui.jsx';

export function StoreScanner({ wardrobe, log, onAdd, onClose, canAdd = true, onLimit, categories = CATEGORIES }) {
  const [cand, setCand] = useState({ category: 'bottom', shape: 'pantalon', color: null, fit: 'regular', waistband: 'NONE', photo: null, name: '' });
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const set = (patch) => setCand((c) => ({ ...c, ...patch }));

  async function onPhoto(file) {
    setBusy(true);
    try {
      const photo = await resizeImage(file, 360);
      set({ photo, color: await dominantColor(photo) });
    } finally {
      setBusy(false);
    }
  }

  const analysis = useMemo(() => (cand.color ? analyzeStoreItem(cand, wardrobe, log) : null), [cand, wardrobe, log]);
  const catWord = CATEGORIES.find((c) => c.id === cand.category)?.search ?? '';
  const baseQuery = cand.name.trim() || `${catWord} ${cand.color ? colorName(cand.color) : ''}`;
  const comfyQuery = `${catWord} ${cand.color ? colorName(cand.color) : ''} pretina elastica`;

  function addToWardrobe() {
    onAdd({
      id: uid(), name: cand.name.trim() || `${CATEGORIES.find((c) => c.id === cand.category).long} ${colorName(cand.color)}`,
      category: cand.category, shape: cand.shape, color: cand.color, photo: cand.photo,
      seasons: ['calido', 'templado', 'frio'], occasions: ['casual', 'trabajo'],
      comfort: analysis.friendliness, waistband: cand.waistband, fit: cand.fit, fabric: 'Algodón',
    });
    setAdded(true);
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-6">
        <li>
          <p className="mb-3 font-display text-lg font-semibold">1. Sacale una foto a la prenda que te gusta</p>
          <div className="flex items-center gap-4">
            <div className="tag h-32 w-24 shrink-0">
              {cand.photo ? <img src={cand.photo} alt="Prenda escaneada" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-sunk text-muted"><Icon name="camera" className="h-8 w-8" /></div>}
            </div>
            <div className="space-y-2">
              <PhotoPicker onPick={onPhoto} cameraLabel={cand.photo ? 'Sacar otra' : 'Sacar foto'} galleryLabel="Galería" size="md" />
              <p className="max-w-[34ch] text-sm text-muted">{busy ? 'Analizando colores…' : 'Encuadrá la prenda al centro, sobre un fondo liso si podés.'}</p>
            </div>
          </div>
        </li>

        <li>
          <p className="mb-3 font-display text-lg font-semibold">2. Contanos cómo es</p>
          <div className="space-y-4">
            <Field as="div" label="Tipo"><Segmented label="Tipo" options={categories} value={cand.category} onChange={(category) => set({ category })} size="sm" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Color detectado">
                <span className="flex gap-2">
                  <input type="color" value={cand.color || '#888888'} onChange={(e) => set({ color: e.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label="Corregir color" />
                  <input className="field font-bold uppercase" readOnly value={cand.color || 'Sin foto'} aria-label="Color en HEX" />
                </span>
              </Field>
              <Field label="Nombre (opcional)">
                <input className="field" value={cand.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej.: Pantalón cargo beige" />
              </Field>
            </div>
            <Field as="div" label="Corte"><Segmented label="Corte" options={FITS} value={cand.fit} onChange={(fit) => set({ fit })} size="sm" /></Field>
            <Field as="div" label="Pretina"><Segmented label="Pretina" options={WAISTBANDS} value={cand.waistband} onChange={(waistband) => set({ waistband })} size="sm" /></Field>
          </div>
        </li>

        <li aria-live="polite">
          <p className="mb-3 font-display text-lg font-semibold">3. ¿Te conviene comprarla?</p>
          {!analysis ? (
            <p className="rounded-xl bg-sunk px-4 py-3 text-muted">Subí la foto o elegí un color para ver el análisis.</p>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl px-5 py-4 ${{ ok: 'bg-ok-soft', warn: 'bg-warn-soft', bad: 'bg-bad-soft' }[analysis.verdict.tone]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`font-display text-2xl font-semibold ${{ ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[analysis.verdict.tone]}`}>{analysis.verdict.title}</p>
                  <p className="text-right text-sm"><span className="font-display text-2xl font-semibold tabular-nums">{analysis.versatility}%</span><br />versatilidad</p>
                </div>
                <p className="mt-1">{analysis.verdict.text}</p>
                <p className="mt-2 flex items-center gap-2 text-sm">Amigabilidad estimada ante la inflamación <FriendDots value={analysis.friendliness} /></p>
              </div>

              {analysis.warnings.map((w) => (
                <p key={w} className="flex gap-2 text-[0.95rem]"><Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />{w}</p>
              ))}

              {analysis.matches.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">Combina con</p>
                  <ul className="flex gap-3 overflow-x-auto pb-2">
                    {analysis.matches.slice(0, 6).map((m) => (
                      <li key={m.item.id} className="w-24 shrink-0">
                        <div className="tag h-28"><GarmentThumb item={m.item} /></div>
                        <p className="mt-1.5 text-[0.8rem] leading-tight">{m.item.name}</p>
                        <Badge tone="accent" className="mt-1">{m.label}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-line p-4">
                <p className="flex items-center gap-2 font-bold"><Icon name="bag" /> Compará antes de pagar</p>
                <ShopLinks links={shopLinks(baseQuery)} />
                {(cand.waistband === 'RIGID_BUTTON' || cand.fit === 'ajustado') && (
                  <>
                    <p className="pt-1 text-sm text-muted">Versiones con pretina elástica, para usarla también en días de inflamación:</p>
                    <ShopLinks links={shopLinks(comfyQuery)} />
                  </>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                {canAdd || added ? (
                  <Button onClick={addToWardrobe} disabled={added}>
                    {added ? <><Icon name="check" /> Sumada al guardarropa</> : 'Sumar a mi guardarropa'}
                  </Button>
                ) : (
                  <Button onClick={onLimit}><Icon name="lock" /> Sumar con Premium</Button>
                )}
              </div>
            </div>
          )}
        </li>
      </ol>
    </div>
  );
}
