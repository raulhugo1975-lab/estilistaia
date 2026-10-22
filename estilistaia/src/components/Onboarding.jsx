/**
 * Bienvenida de primer uso: 4 pasos cortos, una sola decisión por pantalla.
 *   1. Qué hace la app  2. Nombre  3. Tu cuerpo (escanear / medidas / silueta)  4. Cómo te sentís hoy
 * Siempre se puede saltar; todo se puede cambiar después desde "Hoy".
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GENDERS } from '../lib/gender.js';
import { ComfortTape } from './ComfortTape.jsx';
import { Mannequin } from './Mannequin.jsx';
import { Button, Icon } from './ui.jsx';

const STEPS = 4;

function Progress({ step }) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Paso ${step + 1} de ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <span key={i} className="h-2 flex-1 rounded-full transition-colors" style={{ background: i <= step ? 'var(--accent)' : 'var(--line)' }} />
      ))}
    </div>
  );
}

export function Onboarding({ profile, setProfile, comfort, setComfort, openScan, onDone, onLogin, genderCfg, changeGender }) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => onDone();

  // Mientras está abierta, la app de fondo queda inerte (ni foco ni lector de pantalla).
  useEffect(() => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    return () => { root?.removeAttribute('inert'); document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-40 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label="Bienvenida a EstilistaIA"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-6">
        <div className="flex items-center gap-4">
          <div className="flex-1"><Progress step={step} /></div>
          <button type="button" onClick={finish} className="min-h-[2.75rem] px-2 font-bold text-muted hover:text-ink">Saltar</button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 0 && (
            <div className="space-y-6">
              <Mannequin shapeId="reloj" className="mx-auto h-48" label="" />
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight">Vestite según cómo está tu cuerpo hoy.</h1>
              <ul className="space-y-3 text-[1.1rem]">
                <li className="flex gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-ok" />Un toque y te armamos el outfit del día, según el clima y tu propia ropa.</li>
                <li className="flex gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-ok" />Si un día estás con hinchazón, te sugerimos ropa que no apriete.</li>
                <li className="flex gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-ok" />Te decimos qué talle pedir en Shein, Temu y otras tiendas.</li>
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h1 className="font-display text-[2rem] font-semibold leading-tight">¿Cómo te llamamos?</h1>
              <input autoFocus aria-label="Tu nombre o apodo" className="field !min-h-[3.75rem] !text-[1.25rem]" value={profile.name} placeholder="Tu nombre o apodo"
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && next()} />
              <fieldset className="pt-3">
                <legend className="mb-2 font-display text-xl font-semibold">¿Qué ropa y talles te mostramos?</legend>
                <div role="radiogroup" aria-label="Ropa y talles" className="grid grid-cols-3 gap-2">
                  {GENDERS.map((g) => (
                    <button key={g.id} type="button" role="radio" aria-checked={genderCfg.gender === g.id} onClick={() => changeGender(g.id)}
                      className={`min-h-[4rem] rounded-2xl border-2 px-2 py-2 ${genderCfg.gender === g.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
                      <span className="block font-bold">{g.label}</span>
                      <span className="block text-[0.78rem] text-muted">{g.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted">Adapta las preguntas, las siluetas y las tablas de talles. Lo podés cambiar cuando quieras.</p>
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="font-display text-[2rem] font-semibold leading-tight">Contanos de tu cuerpo</h1>
              <p className="text-[1.05rem] text-muted">Así el probador se parece a vos y los talles son más precisos.</p>
              {profile.body ? (
                <p className="flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-4 text-[1.05rem]"><Icon name="check" className="h-6 w-6 text-ok" />¡Listo! Guardamos tus medidas.</p>
              ) : (
                <div className="space-y-3">
                  <button type="button" onClick={() => openScan('scan')} className="flex w-full items-center gap-4 rounded-2xl border-2 border-accent bg-accent-soft p-4 text-left">
                    <Icon name="camera" className="h-8 w-8 shrink-0 text-accent" />
                    <span><b className="block text-[1.1rem]">Escanear con la cámara</b><span className="text-muted">1 minuto. La forma más precisa.</span></span>
                  </button>
                  <button type="button" onClick={() => openScan('manual')} className="flex w-full items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 text-left hover:border-ink">
                    <Icon name="ruler" className="h-8 w-8 shrink-0" />
                    <span><b className="block text-[1.1rem]">Escribir mis medidas</b><span className="text-muted">Si tenés un centímetro a mano.</span></span>
                  </button>
                  <p className="pt-2 font-bold">O elegí la silueta más parecida a la tuya:</p>
                  <div className={`grid gap-1.5 ${genderCfg.shapes.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                    {genderCfg.shapes.map((s) => (
                      <button key={s.id} type="button" aria-pressed={profile.bodyShape === s.id} onClick={() => setProfile((p) => ({ ...p, bodyShape: s.id }))}
                        className={`rounded-xl border-2 px-1 pb-2 pt-1 ${profile.bodyShape === s.id ? 'border-accent bg-accent-soft' : 'border-line'}`}>
                        <Mannequin shapeId={s.id} custom={s.dims} className="mx-auto h-16" label={s.label} />
                        <span className="block text-[0.72rem] font-bold leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h1 className="font-display text-[2rem] font-semibold leading-tight">¿Cómo te sentís hoy?</h1>
              <p className="text-[1.05rem] text-muted">1 es un día liviano. 5 es un día con mucha hinchazón o en que necesitás máxima comodidad.</p>
              <ComfortTape value={comfort} onChange={setComfort} compact id="comfort-onboarding" />
              <p className="text-muted">Lo podés cambiar todos los días desde arriba de la pantalla.</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {step < STEPS - 1 ? (
            <Button size="lg" className="w-full" onClick={next}>{step === 0 ? 'Empezar' : 'Seguir'} <Icon name="arrow" className="h-5 w-5" /></Button>
          ) : (
            <Button size="lg" className="w-full" onClick={finish}>Generar mi primer outfit <Icon name="arrow" className="h-5 w-5" /></Button>
          )}
          {step === 0 && onLogin && <Button variant="ghost" className="w-full" onClick={onLogin}>Ya tengo cuenta: entrar</Button>}
          {step > 0 && <Button variant="ghost" className="w-full" onClick={back}>Volver</Button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
