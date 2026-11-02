-- Salario con historial: cada cambio aplica desde un mes (desde) en adelante.
-- Los ítems en porcentaje pendientes de meses afectados se recalculan automáticamente.

create table public.salario_historial (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  desde date not null, -- primer día del mes desde el que aplica
  monto numeric(12, 2) not null check (monto >= 0),
  creado_en timestamptz not null default now()
);

create index salario_historial_user_desde_idx
  on public.salario_historial (user_id, desde desc, creado_en desc);

alter table public.salario_historial enable row level security;

create policy "salario_historial: propio" on public.salario_historial
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Salario vigente para un mes: el cambio más reciente con desde <= mes
create function public.salario_para_mes(p_mes date)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select h.monto
    from public.salario_historial h
   where h.user_id = auth.uid() and h.desde <= p_mes
   order by h.desde desc, h.creado_en desc
   limit 1
$$;

create function public.salario_historial_recalcular()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.budget_entries e
     set monto = round(public.salario_para_mes(e.mes) * e.valor / 100, 2)
   where e.user_id = new.user_id
     and e.mes >= new.desde
     and e.tipo_monto = 'porcentaje'
     and e.transaction_id is null;
  return new;
end;
$$;

create trigger salario_historial_recalcular
  after insert on public.salario_historial
  for each row
  execute function public.salario_historial_recalcular();

-- Migrar el salario mensual existente al historial
insert into public.salario_historial (user_id, desde, monto)
select user_id, mes, salario from public.budget_months;

-- Generar mes usa el salario vigente
create or replace function public.generar_mes(p_mes date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_salario numeric(12, 2);
  v_creados integer;
begin
  v_salario := public.salario_para_mes(p_mes);
  if v_salario is null then
    raise exception 'Configura primero el salario en Más → Salario';
  end if;

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

-- Al quitar el pago, un porcentaje vuelve a calcularse con el salario vigente de su mes
create or replace function public.set_budget_entry_status(p_entry uuid, p_cuenta uuid)
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
                        then coalesce(round(public.salario_para_mes(e.mes) * e.valor / 100, 2), e.monto)
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

drop table public.budget_months;
drop function public.budget_months_recalcular();
