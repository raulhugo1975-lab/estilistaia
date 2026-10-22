/**
 * Cliente de Supabase para el navegador (clave pública "anon" / "publishable").
 * Si faltan las variables, la app funciona igual en modo local, sin cuentas.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;
export const HAS_CLOUD = !!supabase;
