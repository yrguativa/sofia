-- Transferencias entre cuentas y políticas más estrictas (categorías y cuentas propias).

alter table public.transactions
  add column cuenta_destino_id uuid references public.accounts (id) on delete cascade;

alter table public.transactions
  add constraint transactions_transferencia_check check (
    (tipo = 'transferencia'
      and cuenta_destino_id is not null
      and cuenta_destino_id <> account_id
      and category_id is null)
    or
    (tipo <> 'transferencia' and cuenta_destino_id is null)
  );

drop policy "transactions: propio" on public.transactions;

create policy "transactions: propio" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and account_id in (select id from public.accounts where user_id = (select auth.uid()))
    and (cuenta_destino_id is null
      or cuenta_destino_id in (select id from public.accounts where user_id = (select auth.uid())))
    and (category_id is null
      or category_id in (select id from public.categories
                         where user_id is null or user_id = (select auth.uid())))
  );

drop policy "budgets: propio" on public.budgets;

create policy "budgets: propio" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and category_id in (select id from public.categories
                        where user_id is null or user_id = (select auth.uid()))
  );
