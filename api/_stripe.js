/**
 * Utilidades de Stripe compartidas por /api.
 * Vercel no publica como endpoint los archivos que empiezan con "_".
 */
import Stripe from 'stripe';

let client;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Falta la variable de entorno STRIPE_SECRET_KEY');
  client ??= new Stripe(key);
  return client;
}

/** URL pública de la app: APP_URL si existe; si no, la del pedido actual. */
export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

export const isSessionId = (v) => typeof v === 'string' && /^cs_(test|live)_[A-Za-z0-9]+$/.test(v);
export const ACTIVE = ['active', 'trialing'];

export function methodGuard(req, res, method) {
  if (req.method === method) return true;
  res.setHeader('Allow', method);
  res.status(405).json({ error: 'Método no permitido' });
  return false;
}
