/**
 * Resultado de "Generar outfit de hoy": la ropa puesta sobre tu foto o tu avatar
 * y UNA frase. Nada de listas largas.
 */
import React from 'react';
import { describeWeather, isRainy } from '../lib/weather.js';
import { GarmentThumb, Mannequin } from './Mannequin.jsx';
import { Button, Icon } from './ui.jsx';

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
/** "tu remera" / "tus zapatillas": el posesivo evita errores de género gramatical. */
const yours = (item) => `${/s$/i.test(item.name.split(' ')[0]) ? 'tus' : 'tu'} ${lower(item.name)}`;

/** Frase corta: clima + qué ponerse. */
export function outfitSentence(pieces, weather, comfort) {
  const parts = [];
  if (weather) {
    parts.push(`Hoy hace ${weather.temp}°C y ${describeWeather(weather.code).phrase}.`);
  }
  const { top, bottom, dress, outer, shoes } = pieces;
  let look = dress ? yours(dress) : [top && yours(top), bottom && yours(bottom)].filter(Boolean).join(' con ');
  if (outer) look += `, ${yours(outer)} encima`;
  if (shoes) look += ` y ${yours(shoes)}`;
  parts.push(`Te sugerimos ${look}.`);
  if (isRainy(weather)) parts.push('Llevá paraguas.');
  if (comfort >= 3 && (pieces.bottom || pieces.dress)) parts.push('Cintura cómoda, como pediste.');
  return parts.join(' ');
}

export function OutfitReveal({ outfit, weather, comfort, shapeId, avatarDims, photo, align, canAnother, onAnother, onTryOn, onPhotoLocked, index, total }) {
  const pieces = ['outer', 'top', 'bottom', 'dress', 'shoes'].map((s) => outfit.pieces[s]).filter(Boolean);
  return (
    <section className="reveal panel overflow-hidden" aria-live="polite" aria-labelledby="reveal-text">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative order-2 bg-sunk sm:order-1">
          <Mannequin key={outfit.id} shapeId={shapeId} comfort={comfort} pieces={outfit.pieces} custom={avatarDims} photo={photo} align={align}
            className="mx-auto h-[52dvh] max-h-[520px] w-auto sm:h-auto sm:w-full sm:max-w-[360px]" />
          {!photo && onPhotoLocked && (
            <button type="button" onClick={onPhotoLocked} className="absolute left-3 top-3 rounded-full bg-surface px-3 py-2 text-sm font-bold shadow-sm">
              <Icon name="camera" className="mr-1 inline h-4 w-4" /> Verlo sobre mi foto
            </button>
          )}
          {total > 1 && <span className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1.5 text-sm font-bold">{index + 1} de {total}</span>}
        </div>
        <div className="order-1 flex flex-col gap-5 p-5 sm:order-2 sm:p-7">
          <p id="reveal-text" className="font-display text-[1.3rem] font-semibold leading-snug sm:text-[1.6rem]">{outfitSentence(outfit.pieces, weather, comfort)}</p>
          {/* Las fotos de TU ropa: así se reconoce cada prenda de un vistazo */}
          <ul className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(pieces.length, 4)}, minmax(0, 1fr))` }} aria-label="Tus prendas para hoy">
            {pieces.map((p) => (
              <li key={p.id} className="min-w-0">
                <div className="tag aspect-[4/5]"><GarmentThumb item={p} /></div>
                <p className="mt-1.5 line-clamp-2 text-[0.82rem] font-bold leading-tight">{p.name}</p>
              </li>
            ))}
          </ul>
          {pieces.some((p) => !p.photo) && (
            <p className="text-[0.85rem] text-muted">Las prendas sin foto se ven con su color. Sacales una foto en Mi ropa para reconocerlas mejor.</p>
          )}
          <div className="mt-auto hidden flex-col gap-2 sm:flex sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={onAnother}>
              {canAnother ? <><Icon name="spark" className="h-5 w-5" /> Otra opción</> : <><Icon name="lock" className="h-5 w-5" /> Más opciones con Premium</>}
            </Button>
            <Button size="lg" variant="secondary" onClick={onTryOn}><Icon name="mirror" className="h-5 w-5" /> Cambiar prendas</Button>
          </div>
        </div>
        {/* Botones en móvil: debajo del avatar, al alcance del pulgar */}
        <div className="order-3 flex flex-col gap-2 p-4 sm:hidden">
          <Button size="lg" onClick={onAnother}>
            {canAnother ? <><Icon name="spark" className="h-5 w-5" /> Otra opción</> : <><Icon name="lock" className="h-5 w-5" /> Más opciones con Premium</>}
          </Button>
          <Button size="lg" variant="secondary" onClick={onTryOn}><Icon name="mirror" className="h-5 w-5" /> Cambiar prendas</Button>
        </div>
      </div>
    </section>
  );
}
