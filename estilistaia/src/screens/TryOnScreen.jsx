/**
 * Módulo 4 · Probador virtual simulado.
 * - Muestra la mejor sugerencia del motor sobre la silueta o tu foto.
 * - Al mover la cinta de confort, el outfit se recalcula y avisa qué cambió.
 * - Podés cambiar cada capa a mano; si elegís algo no apto, lo marca.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ComfortTape } from '../components/ComfortTape.jsx';
import { Mannequin } from '../components/Mannequin.jsx';
import { Button, Icon, Segmented } from '../components/ui.jsx';
import { CATEGORIES } from '../data/seed.js';
import { checkGarment, SLOTS } from '../engine/outfitEngine.js';
import { resizeImage } from '../lib/utils.js';
import { autoCenterPhoto } from '../lib/camera.js';
import { usePhotoAlign } from '../lib/photoAlign.js';
import { useDragAlign } from '../lib/useDragAlign.js';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { AdjustPad, SideArrows } from '../components/AdjustPad.jsx';
import { APP_VERSION } from '../version.js';

export default function TryOnScreen({ result, comfort, setComfort, symptoms, profile, override, setOverride, wardrobe, bodyPhoto, setBodyPhoto, isPremium, requestPremium, avatarDims, openScan }) {
  const [idx, setIdx] = useState(0);
  const [modeRaw, setModeRaw] = useState(bodyPhoto ? 'foto' : 'silueta');
  // Probador completo (tu foto, capas a mano, otras opciones) = Premium.
  const mode = isPremium ? modeRaw : 'silueta';
  const lockMsg = 'El probador completo es Premium: tu foto de cuerpo entero, capas a elección y todas las opciones.';
  const setMode = (m) => (m === 'foto' && !isPremium ? requestPremium(lockMsg) : setModeRaw(m));
  // Ajuste guardado por foto: si la foto cambia, vuelve solo al centro.
  const { align, setAlign, reset: centerAlign, isCentered } = usePhotoAlign(bodyPhoto);
  const [photoStatus, setPhotoStatus] = useState('');
  const [dragged, setDragged] = useState(false);
  const drag = useDragAlign(mode === 'foto' && !!bodyPhoto, align, (u) => { setDragged(true); setAlign(u); });
  const [toast, setToast] = useState(null);

  const safeIdx = isPremium ? Math.min(idx, Math.max(0, result.outfits.length - 1)) : 0;
  const auto = result.outfits[safeIdx]?.pieces ?? {};
  const pieces = override ?? auto;

  // Avisar qué prendas cambiaron cuando se mueve el nivel de confort.
  const prev = useRef({ comfort, pieces });
  useEffect(() => {
    const p = prev.current;
    if (p.comfort !== comfort) {
      const changes = SLOTS.map((s) => {
        const a = p.pieces?.[s], b = pieces?.[s];
        if (a && b && a.id !== b.id) return `${a.name} → ${b.name}`;
        if (a && !b) return `Sin ${a.name.toLowerCase()}`;
        if (!a && b) return `Suma ${b.name.toLowerCase()}`;
        return null;
      }).filter(Boolean);
      setToast(changes.length ? { level: comfort, changes } : null);
    }
    prev.current = { comfort, pieces };
  }, [comfort, pieces]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function choose(slot, id) {
    const item = wardrobe.find((w) => w.id === id) || null;
    const next = { ...pieces };
    if (item) next[slot] = item; else delete next[slot];
    if (slot === 'dress' && item) { delete next.top; delete next.bottom; }
    if ((slot === 'top' || slot === 'bottom') && item) delete next.dress;
    setOverride(next);
  }

  /** Foto subida a mano: se centra sola (cabeza arriba, pies abajo, cuerpo al medio) si se detecta a la persona. */
  async function onPhoto(file) {
    setPhotoStatus('Centrando tu foto…');
    const { photo, centered } = await autoCenterPhoto(await resizeImage(file, 900, 0.85));
    setBodyPhoto(photo);
    setModeRaw('foto');
    setPhotoStatus(centered ? 'Listo: centramos la ropa sobre vos.' : 'Si la ropa no queda justo sobre vos, usá los controles de abajo.');
  }

  const warnings = SLOTS.map((s) => pieces[s]).filter(Boolean)
    .map((p) => ({ p, ...checkGarment(p, { comfort, symptoms }) })).filter((r) => !r.ok);
  const visibleSlots = pieces.dress ? ['outer', 'dress', 'shoes'] : ['outer', 'top', 'bottom', 'shoes'];
  const allSlots = ['outer', 'top', 'bottom', 'dress', 'shoes'].filter((sl) => sl !== 'dress' || wardrobe.some((w) => w.category === 'dress'));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.4rem)] font-semibold tracking-tight">Probador</h1>
        <p className="mt-1 hidden text-muted sm:block">Mové la cinta de comodidad y mirá cómo cambia el outfit.</p>
      </header>

      {/* Estado del avatar: si no hay medidas, invitar a escanear */}
      {!profile.body && (
        <section className="flex flex-col gap-4 rounded-[22px] border-2 border-dashed border-[var(--tape)] p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-display text-xl font-semibold">Hacé que el avatar se parezca a vos</p>
            <p className="mt-1 text-muted">Escaneá tu cuerpo con la cámara en 1 minuto, o escribí tus medidas. Las prendas se dibujan a tu medida.</p>
          </div>
          <Button size="lg" onClick={openScan}><Icon name="body" className="h-6 w-6" /> Escanear mi cuerpo</Button>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="panel relative overflow-hidden p-4 sm:p-6" aria-label="Vista del probador">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Vista" value={mode} onChange={setMode}
              options={[{ id: 'silueta', label: 'Mi avatar' }, { id: 'foto', label: isPremium ? 'Mi foto' : 'Mi foto (Premium)' }]} />
          </div>

          <div {...drag} className="relative mx-auto max-w-[340px] overflow-hidden rounded-2xl bg-sunk">
            <Mannequin shapeId={profile.bodyShape} comfort={comfort} pieces={pieces} custom={avatarDims}
              photo={mode === 'foto' ? bodyPhoto : null} align={align} className="pointer-events-none h-auto w-full" />
            {mode === 'foto' && bodyPhoto && <SideArrows setAlign={(u) => { setDragged(true); setAlign(u); }} />}
            {mode === 'foto' && bodyPhoto && !dragged && (
              <p className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-2 text-center text-sm font-bold text-paper opacity-90" aria-hidden="true">
                Tocá las flechas ◀ ▶ o arrastrá la ropa para centrarla
              </p>
            )}
          </div>
          {profile.body && mode === 'silueta' && (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-center text-[0.95rem] text-muted">
              <Icon name="check" className="h-4 w-4 text-ok" /> Con tus medidas ({profile.body.measures.bust}, {profile.body.measures.waist} y {profile.body.measures.hip} cm).
              <button type="button" onClick={openScan} className="min-h-[2.75rem] font-bold text-accent underline underline-offset-4">Actualizar</button>
            </p>
          )}

          {mode === 'foto' && !bodyPhoto && (
            <div className="mt-4 space-y-3 text-center">
              <p className="text-muted">Para ver la ropa sobre vos, necesitamos una foto de frente, de pies a cabeza.</p>
              <Button size="lg" className="w-full" onClick={openScan}><Icon name="body" className="h-6 w-6" /> Escanear mi cuerpo (se alinea solo)</Button>
              <PhotoPicker onPick={onPhoto} cameraLabel="Sacar foto" galleryLabel="Subir una foto" facing="user" size="md" />
            </div>
          )}
          {mode === 'foto' && bodyPhoto && (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Ajustar ropa sobre la foto</p>
                <Button variant="secondary" size="sm" onClick={centerAlign} disabled={isCentered}><Icon name="undo" className="h-4 w-4" /> Volver al centro</Button>
              </div>
              {photoStatus && <p className="mt-1 text-[0.92rem] text-muted" role="status">{photoStatus}</p>}
              <div className="mt-3"><AdjustPad align={align} setAlign={setAlign} /></div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                <Button variant="secondary" size="sm" onClick={openScan}>Repetir escaneo</Button>
                <Button variant="ghost" size="sm" onClick={() => { setBodyPhoto(null); setModeRaw('silueta'); setPhotoStatus(''); }}>Borrar mi foto</Button>
              </div>
              <p className="mt-2 text-right text-[0.75rem] text-muted">Versión {APP_VERSION}</p>
            </div>
          )}

          <div aria-live="polite" className="pointer-events-none absolute inset-x-4 bottom-4 sm:inset-x-6">
            {toast && (
              <div className="toast pointer-events-auto rounded-2xl bg-ink px-4 py-3 text-paper">
                <p className="font-bold">Nivel {toast.level}: cambiamos a una opción {toast.level >= 3 ? 'más cómoda' : 'con más estructura'}</p>
                <ul className="mt-1 text-sm opacity-90">{toast.changes.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-label="Nivel de confort">
            <ComfortTape value={comfort} onChange={setComfort} compact id="comfort-tryon" />
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="layers-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="layers-title" className="font-display text-lg font-semibold">Qué tenés puesto</h2>
              {override ? (
                <Button variant="ghost" className="!px-3 !py-1.5 text-sm" onClick={() => setOverride(null)}><Icon name="undo" className="h-4 w-4" /> Volver a la sugerencia</Button>
              ) : result.outfits.length > 1 && isPremium && (
                <Segmented label="Sugerencia" size="sm" value={String(safeIdx)} onChange={(v) => setIdx(Number(v))}
                  options={result.outfits.map((_, i) => ({ id: String(i), label: `Opción ${i + 1}` }))} />
              )}
            </div>

            {result.outfits.length === 0 && !override && (
              <p className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-warn">No hay un outfit apto con la ocasión y el clima elegidos. Elegí las capas a mano o cambiá la ocasión en Outfits.</p>
            )}

            {!isPremium && (
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sunk px-4 py-3 text-[0.93rem]">
                <Icon name="lock" className="h-4 w-4 text-accent" /> Elegir capas a mano y ver otras opciones es Premium.
                <button type="button" className="font-bold text-accent underline underline-offset-2" onClick={() => requestPremium(lockMsg)}>Desbloquear</button>
              </p>
            )}
            <div className="mt-4 space-y-3">
              {(pieces.dress || pieces.top || pieces.bottom ? visibleSlots : allSlots).map((slot) => {
                const cat = CATEGORIES.find((c) => c.id === slot);
                const options = wardrobe.filter((w) => w.category === slot);
                return (
                  <label key={slot} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
                    <span className="text-sm font-bold">{cat.long}</span>
                    <select className="field disabled:opacity-60" disabled={!isPremium} value={pieces[slot]?.id || ''} onChange={(e) => choose(slot, e.target.value)}>
                      <option value="">Ninguna</option>
                      {options.map((o) => {
                        const ok = checkGarment(o, { comfort, symptoms }).ok;
                        return <option key={o.id} value={o.id}>{o.name}{ok ? '' : ' (no apta hoy)'}</option>;
                      })}
                    </select>
                  </label>
                );
              })}
            </div>

            {warnings.length > 0 && (
              <div role="alert" className="mt-5 space-y-2 rounded-2xl bg-bad-soft p-4 text-bad">
                {warnings.map(({ p, reasons }) => (
                  <p key={p.id} className="flex gap-2"><Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" /><span><b>{p.name}:</b> {reasons[0]}</span></p>
                ))}
              </div>
            )}
            {!override && result.outfits[safeIdx] && (
              <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-[0.92rem] text-muted">
                {result.outfits[safeIdx].notes.map((n) => <li key={n} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{n}</li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Deslizador de ajuste con su texto a cada lado y botones +/- para mover de a poco. */
