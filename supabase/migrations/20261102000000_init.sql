-- Esquema inicial de Finanzas: perfiles, cuentas, categorías, movimientos, presupuestos y metas.
-- Todas las tablas de usuario tienen RLS: cada usuario solo ve y modifica sus propios datos.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  moneda char(3) not null default 'COP',
  creado_en timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'banco', 'tarjeta', 'ahorro')),
  saldo_inicial numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = predefinida del sistema
  nombre text not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  icono text
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  monto numeric(12, 2) not null check (monto > 0),
  tipo text not null check (tipo in ('ingreso', 'gasto', 'transferencia')),
  fecha date not null default current_date,
  nota text,
  creado_en timestamptz not null default now()
);
create index transactions_user_fecha_idx on public.transactions (user_id, fecha desc);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  mes date not null, -- primer día del mes
  limite numeric(12, 2) not null check (limite >= 0),
  unique (user_id, category_id, mes)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  objetivo numeric(12, 2) not null check (objetivo > 0),
  ahorrado numeric(12, 2) not null default 0 check (ahorrado >= 0),
  fecha_meta date
);

-- Perfil automático al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

create policy "profiles: propio" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "accounts: propio" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: lectura de predefinidas y propias" on public.categories
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "categories: escritura propia" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "transactions: propio" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and account_id in (select id from public.accounts where user_id = (select auth.uid()))
  );

create policy "budgets: propio" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "goals: propio" on public.goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Categorías predefinidas
insert into public.categories (user_id, nombre, tipo, icono) values
  (null, 'Salario', 'ingreso', '💼'),
  (null, 'Otros ingresos', 'ingreso', '💰'),
  (null, 'Alimentación', 'gasto', '🍽️'),
  (null, 'Transporte', 'gasto', '🚌'),
  (null, 'Vivienda', 'gasto', '🏠'),
  (null, 'Servicios', 'gasto', '💡'),
  (null, 'Salud', 'gasto', '🩺'),
  (null, 'Entretenimiento', 'gasto', '🎬'),
  (null, 'Compras', 'gasto', '🛍️'),
  (null, 'Otros gastos', 'gasto', '📦');
