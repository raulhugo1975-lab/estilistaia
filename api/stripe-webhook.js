/**
 * POST /api/stripe-webhook
 * Stripe avisa acá de pagos, renovaciones, cambios y cancelaciones.
 * Configuralo en Stripe → Developers → Webhooks con los eventos:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 */
import { getStripe, methodGuard } from './_stripe.js';
import { saveSubscription } from './_supabase.js';

// La firma se verifica sobre el cuerpo crudo: no hay que parsearlo como JSON.
export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const stripe = getStripe();

  let event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('Falta la variable de entorno STRIPE_WEBHOOK_SECRET');
    event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('[webhook] firma', err.message);
    return res.status(400).send(`Webhook inválido: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          await saveSubscription(sub, s.client_reference_id || s.metadata?.user_id);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await saveSubscription(event.data.object);
        break;
      default:
        break; // otros eventos se ignoran
    }
    res.status(200).json({ received: true });
  } catch (err) {
    // 500 hace que Stripe reintente el envío más tarde.
    console.error('[webhook] proceso', err);
    res.status(500).json({ error: 'No se pudo procesar el evento.' });
  }
}
