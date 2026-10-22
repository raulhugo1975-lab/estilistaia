/**
 * Módulo 2 · Guardarropa digital + escaneo en tienda.
 * Cada prenda es una "etiqueta colgante" que indica si es apta para hoy.
 */
import React, { useState } from 'react';
import { GarmentForm } from '../components/GarmentForm.jsx';
import { GarmentThumb } from '../components/Mannequin.jsx';
import { StoreScanner } from '../components/StoreScanner.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { Badge, Button, Chip, FriendDots, Icon, Modal } from '../components/ui.jsx';
import { dominantColor, resizeImage } from '../lib/utils.js';
import { CATEGORIES, WAISTBANDS } from '../data/seed.js';
import { checkGarment } from '../engine/outfitEngine.js';
import { FREE_LIMITS } from '../lib/premium.js';

export default function WardrobeScreen({ wardrobe, setWardrobe, comfort, symptoms, log, isPremium, requestPremium, profile, genderCfg }) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null | {} (nueva) | prenda
  const [scanning, setScanning] = useState(false);
  // Versión gratuita: tope de prendas. Premium: ilimitado.
  const own = wardrobe.filter((g) => !g.example).length; // las de ejemplo no cuentan
  const examples = wardrobe.length - own;
  const atLimit = !isPremium && own >= FREE_LIMITS.wardrobe;
  const limitMsg = `La versión gratuita guarda hasta ${FREE_LIMITS.wardrobe} prendas. Con Premium tu guardarropa es ilimitado.`;
  const startNew = (initial = {}) => (atLimit ? requestPremium(limitMsg) : setEditing(initial));
  /** Foto primero: se saca (o elige) y se abre el formulario con la foto y el color ya cargados. */
  async function addFromPhoto(file) {
    const photo = await resizeImage(file, 360);
    setEditing({ photo, color: await dominantColor(photo), category: filter === 'all' ? 'top' : filter });
  }
  const list = filter === 'all' ? wardrobe : wardrobe.filter((i) => i.category === filter);

  const save = (item) => {
    setWardrobe((w) => (w.some((x) => x.id === item.id) ? w.map((x) => (x.id === item.id ? item : x)) : [item, ...w]));
    setEditing(null);
  };
  const remove = (id) => { setWardrobe((w) => w.filter((x) => x.id !== id)); setEditing(null); };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-tight">Mi ropa</h1>
        <p className="mt-1 text-muted">
          {isPremium ? `${own} prendas tuyas.` : `${own} de ${FREE_LIMITS.wardrobe} prendas tuyas en la versión gratuita.`} Las que dicen "Hoy no" te pueden apretar en tu nivel {comfort}.
        </p>
      </header>

      {/* Acción principal: sumar una prenda sacándole una foto */}
      <section className="panel p-5 sm:p-6" aria-labelledby="add-title">
        <h2 id="add-title" className="font-display text-xl font-semibold">Sumá una prenda</h2>
        <p className="mt-1 mb-4 text-muted">Sacale una foto y respondé tres preguntas. Tarda menos de un minuto.</p>
        {atLimit ? (
          <Button size="lg" onClick={() => requestPremium(limitMsg)}><Icon name="lock" className="h-6 w-6" /> Sumar más prendas con Premium</Button>
        ) : (
          <PhotoPicker onPick={addFromPhoto} cameraLabel="Sacar foto de la prenda" />
        )}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
          {!atLimit && <button type="button" onClick={() => startNew({ category: filter === 'all' ? 'top' : filter })} className="min-h-[2.75rem] font-bold text-accent underline underline-offset-4">Agregar sin foto</button>}
          <button type="button" onClick={() => setScanning(true)} className="inline-flex min-h-[2.75rem] items-center gap-2 text-left font-bold text-accent underline underline-offset-4">
            <Icon name="bag" className="h-5 w-5" /> ¿Estás en una tienda? Mirá si combina antes de comprar
          </button>
        </div>
      </section>

      {examples > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-sunk px-4 py-3">
          <span>Hay {examples} prendas de ejemplo para que pruebes la app.</span>
          <button type="button" onClick={() => setWardrobe((w) => w.filter((g) => !g.example))} className="min-h-[2.75rem] font-bold text-accent underline underline-offset-4">Quitar los ejemplos</button>
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>Todo</Chip>
        {genderCfg.categories.filter((c) => c.id !== 'dress' || wardrobe.some((g) => g.category === 'dress')).map((c) => <Chip key={c.id} selected={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</Chip>)}
      </div>

      {list.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-display text-xl font-semibold">Todavía no hay prendas de este tipo.</p>
          <Button className="mt-4" onClick={() => startNew({ category: filter === 'all' ? 'top' : filter })}>Agregar la primera</Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((item) => {
            const check = checkGarment(item, { comfort, symptoms });
            return (
              <li key={item.id} className="h-full">
                <button type="button" onClick={() => setEditing(item)} className="tag block h-full w-full text-left" aria-label={`Editar ${item.name}`}>
                  <div className="aspect-[4/5]"><GarmentThumb item={item} /></div>
                  <div className="space-y-2 p-3">
                    <p className="font-bold leading-snug">{item.name}{item.example && <span className="ml-1.5 align-middle text-[0.75rem] font-bold text-muted">EJEMPLO</span>}</p>
                    <p className="text-[0.82rem] text-muted">{WAISTBANDS.find((w) => w.id === item.waistband)?.label}, {item.fabric.toLowerCase()}</p>
                    <div className="flex items-center justify-between gap-2">
                      <FriendDots value={item.comfort} />
                      {check.ok ? <Badge tone="ok">Apta hoy</Badge> : <Badge tone="bad">Hoy no</Badge>}
                    </div>
                    {!check.ok && <p className="text-[0.8rem] leading-snug text-muted">{check.reasons[0]}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar prenda' : 'Nueva prenda'}>
        {editing && <GarmentForm initial={editing} style={profile.style} onSave={save} onDelete={remove} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={scanning} onClose={() => setScanning(false)} title="Escanear prenda en tienda" wide>
        {scanning && <StoreScanner wardrobe={wardrobe} log={log} categories={genderCfg.categories} canAdd={!atLimit} onLimit={() => { setScanning(false); requestPremium(limitMsg); }} onAdd={(item) => setWardrobe((w) => [item, ...w])} onClose={() => setScanning(false)} />}
      </Modal>
    </div>
  );
}
