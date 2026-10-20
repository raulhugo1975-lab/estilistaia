/**
 * Sesión de Supabase Auth: enlace mágico por email y, opcionalmente, Google.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export const GOOGLE_ENABLED = import.meta.env.VITE_AUTH_GOOGLE === 'true';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, ready };
}

const redirectTo = () => window.location.origin;

export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw new Error(error.status === 429 ? 'Pediste muchos enlaces seguidos. Esperá un minuto y probá de nuevo.' : 'No pudimos enviar el enlace. Revisá el email.');
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  if (error) throw new Error('No pudimos conectar con Google.');
}

export const signOut = () => supabase?.auth.signOut();
