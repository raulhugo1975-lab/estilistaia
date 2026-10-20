# EstilistaIA

App de estilismo inclusiva (React 18 + Vite + Tailwind) con cuentas y datos en Supabase,
suscripción Premium con Stripe Checkout y despliegue en Vercel.

## Estructura
```
api/                        Funciones serverless de Vercel (Node 20)
  _stripe.js                Cliente de Stripe y utilidades (no es un endpoint)
  checkout.js               POST  /api/checkout             → URL de Stripe Checkout
  _supabase.js              Cliente service_role, validación del token y guardado de suscripciones
  verify-session.js         GET   /api/verify-session       → confirma el pago al volver
  portal.js                 POST  /api/portal               → portal de cliente (cancelar, tarjeta)
  stripe-webhook.js         POST  /api/stripe-webhook       → renovaciones, cambios y cancelaciones
supabase/migrations/0001_estilistaia.sql   Tablas, RLS y funciones (correr una vez)
src/
  lib/supabase.js · auth.js · cloudSync.js   Cliente, sesión (enlace mágico) y sincronización
  lib/premium.js            Prueba, referidos y suscripción leídos de Supabase
  components/Premium.jsx    Banner del plan, tabla de planes, bloqueo de funciones
.env.example                Todas las variables necesarias
vercel.json                 Rutas (incluye /invitacion) y caché de /api
```

## Desarrollo local
```bash
npm install
cp .env.example .env.local     # completá con claves de PRUEBA (sk_test_ / price_ de test)
npm run dev                    # solo frontend, con simulador Premium
npx vercel dev                 # frontend + /api, para probar el pago de punta a punta
```
Tarjeta de prueba de Stripe: 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.

## Cómo funciona
- Cuentas: Supabase Auth con enlace mágico por email (Google opcional). Sin cuenta, la app funciona en modo local.
- Datos: guardarropa, perfil, medidas e historial se sincronizan en `user_state`. La foto de cuerpo entero queda en el dispositivo.
- Prueba de 7 días: `start_trial()` en la base, una por cuenta y con la hora del servidor.
- Referidos: `/invitacion?ref=codigo` guarda el código; al crear la cuenta, `claim_referral()` lo registra y activa la prueba.
- Suscripción: `/api/checkout` (con el token de la sesión) → Stripe → `/api/verify-session` y el webhook escriben en `subscriptions`.
  La app solo lee esa tabla, con RLS: nadie puede marcarse Premium desde el navegador.
