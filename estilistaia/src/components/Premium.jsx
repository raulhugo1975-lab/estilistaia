/**
 * EstilistaIA · Interfaz del plan Premium
 *  - PremiumBanner: franja superior con el estado del plan y el botón de pago
 *                   (el interruptor de simulación solo aparece en desarrollo).
 *  - PlansModal:    comparación gratuita vs. Premium (se abre al tocar algo bloqueado).
 *  - Locked:        capa que tapa una función avanzada en la versión gratuita.
 */
import React from 'react';
import { FREE_LIMITS, PLAN_FEATURES, PRICE_LABEL, SHOW_SIMULATOR, TRIAL_DAYS } from '../lib/premium.js';
import { Button, Icon, Modal, Segmented } from './ui.jsx';

/** Interruptor accesible (role="switch"). */
function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-3 rounded-full py-1 pl-1 pr-1 text-left">
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-tape' : 'bg-sunk'}`} style={{ boxShadow: 'inset 0 0 0 1.5px var(--line)' }}>
        <span className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${checked ? 'left-6 bg-[var(--tape-ink)]' : 'left-1 bg-[var(--muted)]'}`} />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

/** Siete segmentos: los días de prueba que quedan. */
function DaysLeft({ left }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`Quedan ${left} de ${TRIAL_DAYS} días de prueba`}>
      {Array.from({ length: TRIAL_DAYS }, (_, i) => (
        <span key={i} className="h-2 w-4 rounded-full" style={{ background: i < left ? 'var(--tape)' : 'var(--line)' }} />
      ))}
    </span>
  );
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

export function PremiumBanner({ plan, onShare, onPlans }) {
  const { user, account, status, isPro, isPremium, canStartTrial, billing, startTrial, subscribe, manage, simulator } = plan;
  const sub = account.subscription;
  const referred = !!account.profile?.referred_by;

  let text;
  if (simulator?.view === 'premium') text = <><b>Modo demo:</b> todo desbloqueado para probar.</>;
  else if (billing.error) text = <span className="text-bad"><b>No se pudo completar:</b> {billing.error}</span>;
  else if (billing.notice) text = <b>{billing.notice}</b>;
  else if (billing.loading) text = <>Conectando con el sistema de pagos…</>;
  else if (isPro) text = sub?.current_period_end
    ? <><b>Premium activo.</b> {sub.cancel_at_period_end ? `Termina el ${fmtDate(sub.current_period_end)}.` : `Se renueva el ${fmtDate(sub.current_period_end)}.`}</>
    : <><b>Premium activo.</b></>;
  else if (sub?.status === 'past_due') text = <span className="text-warn"><b>No pudimos cobrar tu suscripción.</b> Actualizá la tarjeta para no perder Premium.</span>;
  else if (status.active) text = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span><b>Prueba Premium:</b> {status.left === 1 ? 'te queda 1 día' : `te quedan ${status.left} días`}{referred ? ', gracias a una invitación' : ''}.</span>
      <DaysLeft left={status.left} />
    </span>
  );
  else if (status.expired) text = <><b>Terminó tu prueba gratis.</b> <span className="hidden sm:inline">Suscribite para seguir con todo.</span></>;
  else text = <><b>Versión gratuita.</b> <span className="hidden sm:inline">Probá Premium gratis: ropa sin límite, todos los outfits y el probador con tu foto.</span></>;

  return (
    <div className={`border-b border-line ${isPremium ? 'bg-[var(--tape-soft)]' : 'bg-surface'}`} role="region" aria-label="Tu plan">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-8">
        {simulator && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-wide text-paper">Demo</span>
            <Segmented label="Ver la app como" size="sm" value={simulator.view} onChange={simulator.setView}
              options={[{ id: 'premium', label: 'Premium' }, { id: 'free', label: 'Gratuita' }, { id: 'trial', label: 'En prueba' }]} />
          </div>
        )}
        <p className="min-w-0 flex-1 text-[0.92rem]" role="status">{text}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {simulator?.view === 'trial' && status.active && (
            <Button variant="ghost" size="sm" onClick={simulator.advanceDay}>Simular +1 día</Button>
          )}
          {simulator?.view === 'premium' ? null : isPro || sub?.status === 'past_due' ? (
            <Button variant="ghost" size="sm" onClick={manage} disabled={billing.loading}>Gestionar suscripción</Button>
          ) : (
            <>
              {canStartTrial && !status.active && (
                <Button size="sm" onClick={startTrial}>Probar {TRIAL_DAYS} días gratis</Button>
              )}
              {!(canStartTrial && !status.active) && (
                <Button size="sm" onClick={subscribe} disabled={billing.loading}>
                  {billing.loading ? 'Abriendo pago…' : `Suscribirme${PRICE_LABEL ? ` (${PRICE_LABEL})` : ''}`}
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={onPlans}>Ver planes</Button>
          <Button variant="ghost" size="sm" onClick={onShare} aria-label="Invitar a un amige"><Icon name="share" className="h-5 w-5" /><span className="hidden sm:inline">Invitar</span></Button>
        </div>
      </div>
    </div>
  );
}

export function PlansModal({ open, onClose, plan, reason, onShare }) {
  const { status, isPro, canStartTrial, billing, startTrial, subscribe } = plan;
  return (
    <Modal open={open} onClose={onClose} title="EstilistaIA Premium" wide>
      {reason && <p className="mb-5 rounded-xl bg-accent-soft px-4 py-3 text-accent"><Icon name="lock" className="mr-1.5 inline h-4 w-4 align-[-2px]" />{reason}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left">
          <thead>
            <tr className="text-sm text-muted">
              <th className="py-2 pr-4 font-bold">Función</th>
              <th className="py-2 pr-4 font-bold">Gratuita</th>
              <th className="py-2 font-bold text-ink">Premium{PRICE_LABEL ? `, ${PRICE_LABEL}` : ''}</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((f) => (
              <tr key={f.id} className="border-t border-line">
                <td className="py-3 pr-4 font-bold">{f.label}</td>
                <td className="py-3 pr-4 text-muted">{f.free}</td>
                <td className="py-3"><span className="inline-flex items-start gap-1.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{f.premium}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {billing.error && <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-bad">{billing.error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="max-w-[42ch] text-sm text-muted">El pago se hace en Stripe. Podés cancelar cuando quieras desde "Gestionar suscripción".</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onShare}><Icon name="share" /> Invitar a un amige</Button>
          {isPro ? (
            <Button onClick={onClose}><Icon name="check" /> Premium activo</Button>
          ) : (
            <>
              {canStartTrial && !status.active && (
                <Button variant="secondary" onClick={() => { startTrial(); onClose(); }}>Probar {TRIAL_DAYS} días gratis</Button>
              )}
              <Button onClick={() => { subscribe(); }} disabled={billing.loading}>{billing.loading ? 'Abriendo pago…' : 'Suscribirme'}</Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Tapa contenido Premium en la versión gratuita.
 * El contenido de fondo queda desenfocado e inerte (no recibe foco).
 */
export function Locked({ locked, title, text, onUnlock, children, className = '' }) {
  if (!locked) return children;
  return (
    <div className={`relative ${className}`}>
      <div inert="" aria-hidden="true" className="pointer-events-none select-none opacity-60 blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-[30ch] rounded-2xl border border-line bg-surface px-5 py-4 text-center shadow-[0_8px_30px_rgba(20,18,40,.12)]">
          <Icon name="lock" className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-2 font-display text-lg font-semibold leading-tight">{title}</p>
          {text && <p className="mt-1 text-sm text-muted">{text}</p>}
          <Button className="mt-3 !px-3.5 !py-2 text-sm" onClick={onUnlock}>Probar Premium gratis</Button>
        </div>
      </div>
    </div>
  );
}
