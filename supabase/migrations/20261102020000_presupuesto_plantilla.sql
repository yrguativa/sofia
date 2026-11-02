-- Presupuesto por plantilla: ítems recurrentes (valor fijo o porcentaje del salario),
-- generación mensual en estado pendiente y estado de pago que crea/actualiza movimientos.
-- Se eliminan los límites por categoría (tabla budgets).

drop table public.budgets;

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  grupo text not null check (grupo in ('Gastos fijos', 'Gastos variables', 'Deudas', 'Ahorros')),
  categoria_id uuid references public.categories (id) on delete set null,
  tipo_monto text not null check (tipo_monto in ('valor', 'porcentaje')),
  valor numeric(12, 2) not null check (valor >= 0),
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create table public.budget_months (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes date not null, -- primer día del mes
  salario numeric(12, 2) not null default 0 check (salario >= 0),
  primary key (user_id, mes)
);

create table public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes date not null,
  plan_item_id uuid references public.plan_items (id) on delete set null,
  nombre text not null,
  grupo text not null check (grupo in ('Gastos fijos', 'Gastos variables', 'Deudas', 'Ahorros')),
  categoria_id uuid references public.categories (id) on delete set null,
  tipo_monto text not null check (tipo_monto in ('valor', 'porcentaje')),
  valor numeric(12, 2) not null check (valor >= 0),
  monto numeric(12, 2) not null check (monto >= 0),
  transaction_id uuid references public.transactions (id) on delete set null,
  unique (user_id, plan_item_id, mes)
);

-- Recalcula los montos en porcentaje de los ítems pendientes cuando cambia el salario
create function public.budget_months_recalcular()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.budget_entries
     set monto = round(new.salario * valor / 100, 2)
   where user_id = new.user_id
     and mes = new.mes
     and tipo_monto = 'porcentaje'
     and transaction_id is null;
  return new;
end;
$$;

create trigger budget_months_recalcular
  after update of salario on public.budget_months
  for each row
  when (old.salario is distinct from new.salario)
  execute function public.budget_months_recalcular();

-- Genera los ítems de la plantilla para un mes. Es idempotente: no duplica ítems existentes.
create function public.generar_mes(p_mes date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_salario numeric(12, 2);
  v_creados integer;
begin
  insert into public.budget_months (user_id, mes, salario)
  values (
    auth.uid(),
    p_mes,
    coalesce((
      select m.salario from public.budget_months m
       where m.user_id = auth.uid() and m.mes < p_mes
       order by m.mes desc limit 1
    ), 0)
  )
  on conflict (user_id, mes) do nothing;

  select m.salario into v_salario
    from public.budget_months m
   where m.user_id = auth.uid() and m.mes = p_mes;

  insert into public.budget_entries
    (user_id, mes, plan_item_id, nombre, grupo, categoria_id, tipo_monto, valor, monto)
  select auth.uid(), p_mes, p.id, p.nombre, p.grupo, p.categoria_id, p.tipo_monto, p.valor,
         case when p.tipo_monto = 'porcentaje'
              then round(v_salario * p.valor / 100, 2)
              else p.valor
         end
    from public.plan_items p
   where p.user_id = auth.uid() and p.activo
   order by p.orden, p.nombre
  on conflict (user_id, plan_item_id, mes) do nothing;

  get diagnostics v_creados = row_count;
  return v_creados;
end;
$$;

-- Cambia el estado de un ítem. Con cuenta: crea o mueve el movimiento de gasto.
-- Sin cuenta (pendiente): elimina el movimiento asociado.
create function public.set_budget_entry_status(p_entry uuid, p_cuenta uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  e public.budget_entries%rowtype;
  v_tx uuid;
begin
  select * into e
    from public.budget_entries
   where id = p_entry and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Elemento de presupuesto no encontrado';
  end if;

  if p_cuenta is null then
    if e.transaction_id is not null then
      delete from public.transactions where id = e.transaction_id;
    end if;
    update public.budget_entries
       set transaction_id = null,
           monto = case when e.tipo_monto = 'porcentaje'
                        then coalesce((
                          select round(m.salario * e.valor / 100, 2)
                            from public.budget_months m
                           where m.user_id = auth.uid() and m.mes = e.mes
                        ), e.monto)
                        else e.monto
                   end
     where id = p_entry;
    return;
  end if;

  if e.transaction_id is null then
    insert into public.transactions (account_id, category_id, monto, tipo, fecha, nota)
    values (
      p_cuenta,
      e.categoria_id,
      e.monto,
      'gasto',
      case when date_trunc('month', current_date)::date = e.mes then current_date else e.mes end,
      e.nombre
    )
    returning id into v_tx;

    update public.budget_entries set transaction_id = v_tx where id = p_entry;
  else
    update public.transactions set account_id = p_cuenta where id = e.transaction_id;
  end if;
end;
$$;

-- RLS
alter table public.plan_items enable row level security;
alter table public.budget_months enable row level security;
alter table public.budget_entries enable row level security;

create policy "plan_items: propio" on public.plan_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (categoria_id is null or categoria_id in (
      select id from public.categories
      where user_id is null or user_id = (select auth.uid())
    ))
  );

create policy "budget_months: propio" on public.budget_months
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "budget_entries: propio" on public.budget_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (categoria_id is null or categoria_id in (
      select id from public.categories
      where user_id is null or user_id = (select auth.uid())
    ))
  );
