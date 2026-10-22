/**
 * POST /api/checkout   (requiere sesión de Supabase)
 * Crea o reutiliza el cliente de Stripe de la cuenta y devuelve la URL de Checkout.
 */
import { appUrl, getStripe, methodGuard } from './_stripe.js';
import { getAdmin, requireUser } from './_supabase.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new Error('Falta la variable de entorno STRIPE_PRICE_ID');

    const db = getAdmin();
    const stripe = getStripe();
    const [{ data: profile }, { data: current }] = await Promise.all([
      db.from('profiles').select('ref_code, referred_by, stripe_customer_id').eq('id', user.id).single(),
      db.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
    ]);
    if (current && ['active', 'trialing', 'past_due'].includes(current.status)) {
      return res.status(409).json({ error: 'Ya tenés una suscripción. Podés gestionarla desde "Gestionar suscripción".' });
    }

    let customer = profile?.stripe_customer_id;
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customer = created.id;
      await db.from('profiles').update({ stripe_customer_id: customer }).eq('id', user.id);
    }

    // Metadatos visibles en Stripe para medir referidos.
    const metadata = { user_id: user.id, ref_code: profile?.ref_code ?? '', referred_by: profile?.referred_by ?? '' };
    const base = appUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err);
    res.status(500).json({ error: 'No pudimos iniciar el pago. Probá de nuevo en unos minutos.' });
  }
}
