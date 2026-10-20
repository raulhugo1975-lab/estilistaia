/**
 * Módulo 2 · Guardarropa digital + escaneo en tienda.
 * Cada prenda es una "etiqueta colgante" que indica si es apta para hoy.
 */
import React, { useState } from 'react';
import { GarmentForm } from '../components/GarmentForm.jsx';
import { GarmentThumb } from '../components/Mannequin.jsx';
import { StoreScanner } from '../components/StoreScanner.jsx';
import { Badge, Button, Chip, FriendDots, Icon, Modal } from '../components/ui.jsx';
import { CATEGORIES, WAISTBANDS } from '../data/seed.js';
import { checkGarment } from '../engine/outfitEngine.js';
import { FREE_LIMITS } from '../lib/premium.js';

export default function WardrobeScreen({ wardrobe, setWardrobe, comfort, symptoms, log, isPremium, requestPremium }) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null | {} (nueva) | prenda
  const [scanning, setScanning] = useState(false);
  // Versión gratuita: tope de prendas. Premium: ilimitado.
  const atLimit = !isPremium && wardrobe.length >= FREE_LIMITS.wardrobe;
  const limitMsg = `La versión gratuita guarda hasta ${FREE_LIMITS.wardrobe} prendas. Con Premium tu guardarropa es ilimitado.`;
  const startNew = (initial = {}) => (atLimit ? requestPremium(limitMsg) : setEditing(initial));
  const list = filter === 'all' ? wardrobe : wardrobe.filter((i) => i.category === filter);

  const save = (item) => {
    setWardrobe((w) => (w.some((x) => x.id === item.id) ? w.map((x) => (x.id === item.id ? item : x)) : [item, ...w]));
    setEditing(null);
  };
  const remove = (id) => { setWardrobe((w) => w.filter((x) => x.id !== id)); setEditing(null); };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-tight">Tu guardarropa</h1>
          <p className="mt-1 text-muted">{isPremium ? `${wardrobe.length} prendas, sin límite` : `${wardrobe.length} de ${FREE_LIMITS.wardrobe} prendas de la versión gratuita`}. Marcamos cuáles van con tu nivel {comfort} de hoy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => startNew()}><Icon name={atLimit ? 'lock' : 'plus'} /> Agregar prenda</Button>
          <Button onClick={() => setScanning(true)}><Icon name="camera" /> Escanear prenda en tienda</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>Todo</Chip>
        {CATEGORIES.map((c) => <Chip key={c.id} selected={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</Chip>)}
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
                    <p className="font-bold leading-snug">{item.name}</p>
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
        {editing && <GarmentForm initial={editing} onSave={save} onDelete={remove} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={scanning} onClose={() => setScanning(false)} title="Escanear prenda en tienda" wide>
        {scanning && <StoreScanner wardrobe={wardrobe} log={log} canAdd={!atLimit} onLimit={() => { setScanning(false); requestPremium(limitMsg); }} onAdd={(item) => setWardrobe((w) => [item, ...w])} onClose={() => setScanning(false)} />}
      </Modal>
    </div>
  );
}
