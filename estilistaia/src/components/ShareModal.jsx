/**
 * "Invita a un amige / Compartir App"
 * Genera el enlace de referido y su código QR. Quien entre por el enlace
 * recibe automáticamente 7 días de prueba Premium (ver usePremium()).
 */
import React, { useState } from 'react';
import { referralLink, TRIAL_DAYS } from '../lib/premium.js';
import { QRCode } from './QRCode.jsx';
import { Button, Icon, Modal } from './ui.jsx';

/** Copia texto con la API moderna y, si falla (iframes, http), con el método clásico. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function ShareModal({ open, onClose, plan, requestAuth }) {
  const [copied, setCopied] = useState(false);
  const code = plan.refCode;
  const link = code ? referralLink(code) : '';
  const message = `Probá EstilistaIA, la app de estilismo que se adapta a cómo está tu cuerpo cada día. Con mi link tenés ${TRIAL_DAYS} días de Premium gratis: ${link}`;
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  async function onCopy() {
    if (await copyText(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invita a un amige / Compartir App" wide>
      {!code ? (
        <div className="space-y-4 py-2">
          <p className="text-[1.02rem] leading-relaxed">Para que tus invitaciones cuenten, necesitás una cuenta: así tu enlace es único y tus amigos reciben {TRIAL_DAYS} días de Premium gratis.</p>
          <Button onClick={() => { onClose(); requestAuth('Iniciá sesión para obtener tu enlace de invitación.'); }}>Crear cuenta o iniciar sesión</Button>
        </div>
      ) : (
      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <figure className="mx-auto">
          <div className="rounded-2xl border border-line bg-white p-2.5">
            <QRCode value={link} size={196} label={`Código QR del enlace de invitación ${link}`} />
          </div>
          <figcaption className="mt-2 text-center text-[0.82rem] text-muted">Escaneá con la cámara del teléfono</figcaption>
        </figure>

        <div className="min-w-0 space-y-4">
          <p className="text-[1.02rem] leading-relaxed">
            Comparte este link o QR. Tus amigos obtendrán automáticamente {TRIAL_DAYS} días de prueba gratis de las funciones Premium de EstilistaIA. Al cumplirse los {TRIAL_DAYS} días, podrán suscribirse para continuar disfrutando de todas las ventajas.
          </p>

          <div>
            <label htmlFor="ref-link" className="mb-1.5 block text-sm font-bold">Tu enlace de invitación</label>
            <div className="flex gap-2">
              <input id="ref-link" readOnly value={link} onFocus={(e) => e.target.select()} className="field min-w-0 font-bold text-[0.9rem]" />
              <Button onClick={onCopy} className="shrink-0" aria-live="polite">
                {copied ? <><Icon name="check" /> Copiado</> : 'Copiar enlace'}
              </Button>
            </div>
            <p className="mt-1.5 text-[0.82rem] text-muted">Tu código: <b className="text-ink">{code}</b>. {plan.account.referrals === 1 ? '1 persona se registró con tu enlace.' : `${plan.account.referrals} personas se registraron con tu enlace.`}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canNativeShare && (
              <Button variant="secondary" onClick={() => navigator.share({ title: 'EstilistaIA', text: message, url: link }).catch(() => {})}>
                <Icon name="share" /> Compartir
              </Button>
            )}
            <a className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 font-bold hover:border-ink"
              href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
              WhatsApp <Icon name="external" className="h-4 w-4" />
            </a>
            <a className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 font-bold hover:border-ink"
              href={`mailto:?subject=${encodeURIComponent(`Te regalo ${TRIAL_DAYS} días de EstilistaIA Premium`)}&body=${encodeURIComponent(message)}`}>
              Email <Icon name="external" className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-2xl bg-sunk p-4">
            <p className="font-bold">Así funciona la invitación</p>
            <ol className="mt-2 space-y-1.5 text-[0.93rem] text-muted">
              <li>1. Tu amige abre el enlace o escanea el QR.</li>
              <li>2. Crea su cuenta con el email y la app activa {TRIAL_DAYS} días de Premium sin pedir tarjeta.</li>
              <li>3. Al terminar la prueba elige si se suscribe o sigue con la versión gratuita.</li>
            </ol>
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
}
