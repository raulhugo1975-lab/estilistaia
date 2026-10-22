-- ═══════════════════════════════════════════════════════════════
-- EstilistaIA · Esquema de Supabase
-- Ejecutalo una sola vez: Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tablas ──────────────────────────────────────────────────

-- Un perfil por cuenta: código de referido, prueba y cliente de Stripe.
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  ref_code           text not null unique,
  referred_by        text references public.profiles (ref_code) on delete set null,
  trial_started_at   timestamptz,
  stripe_customer_id text unique,
  created_at         timestamptz not null default now()
);

-- Estado de la suscripción. Solo lo escribe el servidor (webhook de Stripe).
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null,          -- active, trialing, past_due, canceled…
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

-- Guardarropa, perfil de estilo, medidas e historial, sincronizados entre dispositivos.
create table if not exists public.user_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 2. Seguridad por fila (RLS) ────────────────────────────────
-- Cada persona solo ve lo suyo. profiles y subscriptions no tienen políticas
-- de escritura: se modifican únicamente con las funciones de abajo o con la
-- clave service_role del servidor.

alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_state    enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_state_select_own on public.user_state;
create policy user_state_select_own on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_state_insert_own on public.user_state;
create policy user_state_insert_own on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists user_state_update_own on public.user_state;
create policy user_state_update_own on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── 3. Perfil automático al registrarse ────────────────────────
-- Genera un código de referido legible: parte local del email + 5 caracteres.

create or replace function public.make_ref_code(email text, uid uuid)
returns text language plpgsql as $$
declare base text;
begin
  base := lower(coalesce(split_part(email, '@', 1), ''));
  base := trim(both '_' from regexp_replace(base, '[^a-z0-9]+', '_', 'g'));
  base := left(base, 14);
  if base = '' then base := 'usuario'; end if;
  return base || '_' || substr(md5(random()::text || uid::text), 1, 5);
end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, ref_code)
  values (new.id, public.make_ref_code(new.email, new.id))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cuentas que ya existían antes de esta migración.
insert into public.profiles (id, ref_code)
select u.id, public.make_ref_code(u.email, u.id) from auth.users u
on conflict (id) do nothing;

-- ── 4. Funciones que llama la app (con la sesión del usuario) ──

-- Inicia la prueba de 7 días. Solo funciona una vez por cuenta y usa la hora del servidor.
create or replace function public.start_trial()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare started timestamptz;
begin
  if auth.uid() is null then raise exception 'Necesitás iniciar sesión'; end if;
  update public.profiles set trial_started_at = now()
   where id = auth.uid() and trial_started_at is null;
  select trial_started_at into started from public.profiles where id = auth.uid();
  return started;
end; $$;

-- Registra quién invitó y activa la prueba (si la cuenta todavía no la usó).
-- Se puede reclamar una sola invitación por cuenta y no la propia.
create or replace function public.claim_referral(code text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  update public.profiles p
     set referred_by = code,
         trial_started_at = coalesce(p.trial_started_at, now())
   where p.id = auth.uid()
     and p.referred_by is null
     and p.ref_code <> code
     and exists (select 1 from public.profiles r where r.ref_code = code);
  return found;
end; $$;

-- Cuántas personas se registraron con mi enlace.
create or replace function public.my_referral_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.profiles
   where referred_by = (select ref_code from public.profiles where id = auth.uid());
$$;

revoke execute on function public.start_trial()        from public, anon;
revoke execute on function public.claim_referral(text) from public, anon;
revoke execute on function public.my_referral_count()  from public, anon;
grant  execute on function public.start_trial()        to authenticated;
grant  execute on function public.claim_referral(text) to authenticated;
grant  execute on function public.my_referral_count()  to authenticated;
