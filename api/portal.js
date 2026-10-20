/**
 * POST /api/portal   (requiere sesión)
 * Abre el portal de cliente de Stripe: tarjeta, facturas y cancelación.
 * Activalo antes en Stripe: Settings → Billing → Customer portal.
 */
import { appUrl, getStripe, methodGuard } from './_stripe.js';
import { getAdmin, requireUser } from './_supabase.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { data: profile } = await getAdmin().from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (!profile?.stripe_customer_id) return res.status(404).json({ error: 'Todavía no tenés una suscripción.' });

    const session = await getStripe().billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: appUrl(req) });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[portal]', err);
    res.status(500).json({ error: 'No pudimos abrir la gestión de tu suscripción.' });
  }
}
