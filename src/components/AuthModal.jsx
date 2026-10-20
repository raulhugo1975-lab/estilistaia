/**
 * Inicio de sesión con enlace mágico (sin contraseña) y Google opcional.
 * La misma acción crea la cuenta si el email es nuevo.
 */
import React, { useState } from 'react';
import { GOOGLE_ENABLED, signInWithEmail, signInWithGoogle } from '../lib/auth.js';
import { Button, Field, Icon, Modal } from './ui.jsx';

export function AuthModal({ open, onClose, reason }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, sent: false, error: '' });

  async function sendLink() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState({ busy: false, sent: false, error: 'Escribí un email válido, por ejemplo nombre@gmail.com.' });
    setState({ busy: true, sent: false, error: '' });
    try {
      await signInWithEmail(email.trim());
      setState({ busy: false, sent: true, error: '' });
    } catch (e) {
      setState({ busy: false, sent: false, error: e.message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Entrar a EstilistaIA">
      {state.sent ? (
        <div className="space-y-3 py-2" role="status">
          <p className="font-display text-2xl font-semibold">Revisá tu correo</p>
          <p className="text-muted">Te mandamos un enlace a <b className="text-ink">{email}</b>. Abrilo en este dispositivo para entrar. Si no aparece en unos minutos, mirá en spam.</p>
          <Button variant="secondary" onClick={() => setState({ busy: false, sent: false, error: '' })}>Usar otro email</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {reason && <p className="rounded-xl bg-accent-soft px-4 py-3 text-accent">{reason}</p>}
          <p className="text-muted">Con una cuenta, tu guardarropa, tus medidas y tu suscripción quedan guardados y los ves en cualquier dispositivo.</p>
          <Field label="Email">
            <input type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLink()} placeholder="nombre@gmail.com" />
          </Field>
          {state.error && <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-bad">{state.error}</p>}
          <Button className="w-full" onClick={sendLink} disabled={state.busy}>{state.busy ? 'Enviando…' : 'Enviarme el enlace para entrar'}</Button>
          {GOOGLE_ENABLED && (
            <Button variant="secondary" className="w-full" onClick={() => signInWithGoogle().catch((e) => setState({ busy: false, sent: false, error: e.message }))}>
              Continuar con Google
            </Button>
          )}
          <p className="flex gap-2 text-[0.82rem] text-muted"><Icon name="lock" className="h-4 w-4 shrink-0" />Sin contraseñas. La foto de cuerpo entero nunca sale de tu dispositivo.</p>
        </div>
      )}
    </Modal>
  );
}
