/**
 * Supabase del lado del servidor (clave service_role: saltea RLS).
 * NUNCA uses esta clave en el frontend.
 */
import { createClient } from '@supabase/supabase-js';
import { ACTIVE } from './_stripe.js';

let admin;
export function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Valida el token "Authorization: Bearer ..." que manda el frontend. Devuelve el usuario o null (ya respondió 401). */
export async function requireUser(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Iniciá sesión para continuar.' });
    return null;
  }
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Tu sesión venció. Volvé a iniciar sesión.' });
    return null;
  }
  return data.user;
}

/**
 * Guarda una suscripción de Stripe en la tabla subscriptions.
 * Busca el usuario por metadata.user_id o, si no está, por el cliente de Stripe.
 */
export async function saveSubscription(sub, userIdHint) {
  const db = getAdmin();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  let userId = userIdHint || sub.metadata?.user_id;
  if (!userId) {
    const { data } = await db.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.id;
  }
  if (!userId) {
    console.warn('[saveSubscription] Sin usuario para el cliente', customerId);
    return null;
  }

  // Un evento viejo (por ej. de una suscripción anterior cancelada) no pisa una activa.
  const { data: existing } = await db.from('subscriptions').select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle();
  if (existing && existing.stripe_subscription_id !== sub.id && ACTIVE.includes(existing.status) && !ACTIVE.includes(sub.status)) {
    return existing;
  }

  // Desde la API 2025-03 el fin de período vive en cada item de la suscripción.
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('subscriptions').upsert(row);
  if (error) throw error;
  return row;
}
