-- ===================================================================
-- SmartMoney Schema v2 - Firestore -> Supabase
-- ===================================================================
-- Diseño relacional con tipos estrictos. Cada entidad es una tabla.
-- Cada transaccion/contrato/etc es 1 FILA, no un array dentro de un blob.
-- Esto vuelve estructuralmente imposible "vaciar todo" con un solo write.
--
-- IDs: tipo TEXT (no uuid) porque la app genera sus propios ids como strings
-- (ej "def1" para quick actions, Date.now().toString() para items nuevos).
-- user_id SI es uuid porque referencia auth.users.
-- Script IDEMPOTENTE: se puede re-correr.

-- ===================================================================
-- DROP de tablas de datos (estan vacias) para recrear con ids TEXT.
-- profiles NO se dropea (su pk user_id uuid esta bien y conserva la fila).
-- ===================================================================
drop table if exists public.income_payments cascade;
drop table if exists public.posts cascade;
drop table if exists public.transactions cascade;
drop table if exists public.savings_buckets cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.debts cascade;
drop table if exists public.events cascade;
drop table if exists public.goals cascade;
drop table if exists public.patrimonio_history cascade;
drop table if exists public.inflation_history cascade;
drop table if exists public.historical_estimates cascade;
drop table if exists public.quick_actions cascade;
drop table if exists public.income_sources cascade;

-- ===================================================================
-- TABLAS
-- ===================================================================

-- 1. PROFILE: 1 fila por usuario (user_id uuid pk, sin cambios)
create table if not exists public.profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  name text default 'Viajero',
  avatar text,
  initial_balance numeric default 0,
  monthly_salary numeric default 0,
  hourly_wage numeric default 0,
  custom_dollar_rate numeric,
  custom_categories text[],
  app_order text[],
  budget_limits jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. INCOME SOURCES
create table public.income_sources (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric default 0,
  currency text default 'ARS' check (currency in ('ARS','USD')),
  type text,
  frequency text default 'MONTHLY' check (frequency in ('MONTHLY','BIWEEKLY','ONE_TIME')),
  start_date date,
  end_date date,
  is_active boolean default true,
  is_creator_source boolean default false,
  income_mode text check (income_mode in ('FIXED','VARIABLE','PER_DELIVERY')),
  medium text,
  hours_per_day numeric,
  days_per_week numeric,
  target_posts integer,
  requires_invoice boolean default false,
  count_delivered_in_salary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index income_sources_user_idx on public.income_sources(user_id);

-- 3. INCOME PAYMENTS (1 por mes por source)
create table public.income_payments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  income_source_id text references public.income_sources(id) on delete cascade not null,
  month text not null,
  real_amount numeric default 0,
  is_paid boolean default false,
  is_invoice_sent boolean default false,
  notes text,
  posts_completed integer,
  posts_paid integer,
  impressions integer,
  rpm numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(income_source_id, month)
);
create index income_payments_user_idx on public.income_payments(user_id);

-- 4. POSTS (entregas PER_DELIVERY)
create table public.posts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  income_source_id text references public.income_sources(id) on delete cascade not null,
  date date not null,
  description text,
  amount numeric default 0,
  is_paid boolean default false,
  paid_date date,
  created_at timestamptz default now()
);
create index posts_user_idx on public.posts(user_id);

-- 5. TRANSACTIONS (la tabla CRITICA - 1 fila por movimiento)
create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income','expense')),
  amount numeric not null,
  description text,
  category text,
  date date not null,
  is_one_time boolean default false,
  event_id text,
  event_name text,
  original_currency text,
  original_amount numeric,
  exchange_rate numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index transactions_user_date_idx on public.transactions(user_id, date desc);
create index transactions_user_category_idx on public.transactions(user_id, category);
create index transactions_user_type_idx on public.transactions(user_id, type);

-- 6. SAVINGS BUCKETS
create table public.savings_buckets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric default 0,
  current_amount numeric default 0,
  icon text,
  created_at timestamptz default now()
);
create index savings_buckets_user_idx on public.savings_buckets(user_id);

-- 7. SUBSCRIPTIONS
create table public.subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  currency text default 'ARS' check (currency in ('ARS','USD')),
  billing_day integer default 1,
  category text default 'Otros',
  frequency text default 'MONTHLY' check (frequency in ('MONTHLY','YEARLY')),
  next_payment_date date,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id);

-- 8. DEBTS
create table public.debts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  total_amount numeric not null,
  current_amount numeric default 0,
  due_date date,
  created_at timestamptz default now()
);
create index debts_user_idx on public.debts(user_id);

-- 9. EVENTS (TravelEvent)
create table public.events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  budget numeric,
  start_date date not null,
  status text default 'active' check (status in ('active','completed')),
  cover_image text,
  created_at timestamptz default now()
);
create index events_user_idx on public.events(user_id);

-- 10. GOALS
create table public.goals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  currency text default 'ARS' check (currency in ('ARS','USD')),
  current_amount numeric default 0,
  deadline date,
  icon text default '',
  color text default '',
  created_at timestamptz default now()
);
create index goals_user_idx on public.goals(user_id);

-- 11. PATRIMONIO HISTORY
create table public.patrimonio_history (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  balance numeric not null,
  dollar_rate numeric,
  date timestamptz default now(),
  unique(user_id, month)
);

-- 12. INFLATION HISTORY
create table public.inflation_history (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  rate numeric not null,
  unique(user_id, month)
);

-- 13. HISTORICAL ESTIMATES
create table public.historical_estimates (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  by_category jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz default now(),
  unique(user_id, month)
);

-- 14. QUICK ACTIONS
create table public.quick_actions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  amount numeric,
  icon text,
  display_order integer default 0,
  created_at timestamptz default now()
);
create index quick_actions_user_idx on public.quick_actions(user_id);

-- ===================================================================
-- TRIGGERS: updated_at automatico
-- ===================================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

drop trigger if exists income_sources_touch on public.income_sources;
create trigger income_sources_touch before update on public.income_sources for each row execute function public.touch_updated_at();

drop trigger if exists income_payments_touch on public.income_payments;
create trigger income_payments_touch before update on public.income_payments for each row execute function public.touch_updated_at();

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch before update on public.transactions for each row execute function public.touch_updated_at();

-- ===================================================================
-- ROW LEVEL SECURITY
-- ===================================================================
alter table public.profiles enable row level security;
alter table public.income_sources enable row level security;
alter table public.income_payments enable row level security;
alter table public.posts enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_buckets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.debts enable row level security;
alter table public.events enable row level security;
alter table public.goals enable row level security;
alter table public.patrimonio_history enable row level security;
alter table public.inflation_history enable row level security;
alter table public.historical_estimates enable row level security;
alter table public.quick_actions enable row level security;

do $$
declare
  tbl text;
  tables text[] := array[
    'profiles', 'income_sources', 'income_payments', 'posts',
    'transactions', 'savings_buckets', 'subscriptions', 'debts',
    'events', 'goals', 'patrimonio_history', 'inflation_history',
    'historical_estimates', 'quick_actions'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists "%s_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_insert" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_update" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_delete" on public.%I', tbl, tbl);
    execute format('create policy "%s_select" on public.%I for select using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_insert" on public.%I for insert with check (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_delete" on public.%I for delete using (auth.uid() = user_id)', tbl, tbl);
  end loop;
end;
$$;

-- ===================================================================
-- ANTI MASS-DELETE PROTECTION
-- ===================================================================
create or replace function public.prevent_mass_delete_check()
returns trigger as $$
declare
  rows_count int;
begin
  select count(*) into rows_count from old_table;
  if rows_count > 100 then
    raise exception 'Mass delete bloqueado por seguridad: % filas de % en una operacion. Hacelo en lotes <= 100.', rows_count, tg_table_name;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists transactions_no_mass_delete on public.transactions;
create trigger transactions_no_mass_delete
after delete on public.transactions
referencing old table as old_table
for each statement
execute function public.prevent_mass_delete_check();

drop trigger if exists income_sources_no_mass_delete on public.income_sources;
create trigger income_sources_no_mass_delete
after delete on public.income_sources
referencing old table as old_table
for each statement
execute function public.prevent_mass_delete_check();

-- ===================================================================
-- AUTO-CREATE PROFILE on signup
-- ===================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Viajero'))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===================================================================
-- REALTIME: agregar tablas a la publicacion supabase_realtime
-- ===================================================================
do $$
declare
  tbl text;
  tables text[] := array[
    'profiles', 'income_sources', 'income_payments', 'posts',
    'transactions', 'savings_buckets', 'subscriptions', 'debts',
    'events', 'goals', 'patrimonio_history', 'inflation_history',
    'historical_estimates', 'quick_actions'
  ];
begin
  foreach tbl in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end;
$$;
