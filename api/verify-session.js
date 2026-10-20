/**
 * GET /api/verify-session?session_id=cs_...   (requiere sesión)
 * Al volver de Checkout, guarda la suscripción en Supabase sin esperar al webhook.
 * El webhook sigue siendo la fuente para renovaciones y cancelaciones.
 */
import { ACTIVE, getStripe, isSessionId, methodGuard } from './_stripe.js';
import { requireUser, saveSubscription } from './_supabase.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const { session_id: sessionId } = req.query;
  if (!isSessionId(sessionId)) return res.status(400).json({ error: 'Sesión de pago inválida.' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== user.id) return res.status(403).json({ error: 'Este pago pertenece a otra cuenta.' });

    const sub = session.status === 'complete' && typeof session.subscription === 'object' ? session.subscription : null;
    if (sub) await saveSubscription(sub, user.id);
    res.status(200).json({ active: !!sub && ACTIVE.includes(sub.status) });
  } catch (err) {
    console.error('[verify-session]', err);
    res.status(500).json({ error: 'No pudimos confirmar el pago todavía. Recargá la página en un momento.' });
  }
}
