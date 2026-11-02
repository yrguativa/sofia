import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Account,
  AccountInput,
  BudgetEntry,
  Category,
  CategoryType,
  Goal,
  GoalInput,
  MontoTipo,
  PlanItem,
  PlanItemInput,
  Profile,
  Transaction,
  TransactionInput,
} from './types'

function unwrap<T>(res: { data: unknown; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function check(res: { error: PostgrestError | null }) {
  if (res.error) throw new Error(res.error.message)
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')
  return data.user.id
}

export async function getProfile(): Promise<Profile> {
  return unwrap<Profile>(await supabase.from('profiles').select('id,nombre,moneda,dia_pago').single())
}

export async function updateProfile(patch: { nombre?: string; moneda?: string; dia_pago?: number }) {
  const id = await currentUserId()
  check(await supabase.from('profiles').update(patch).eq('id', id))
}

export async function listAccounts(): Promise<Account[]> {
  const rows = unwrap<Array<Omit<Account, 'saldo_inicial'> & { saldo_inicial: string | number }>>(
    await supabase.from('accounts').select('id,nombre,tipo,saldo_inicial').order('creado_en'),
  )
  return rows.map((r) => ({ ...r, saldo_inicial: Number(r.saldo_inicial) }))
}

export async function saveAccount(input: AccountInput, id?: string) {
  check(
    id
      ? await supabase.from('accounts').update(input).eq('id', id)
      : await supabase.from('accounts').insert(input),
  )
}

export async function deleteAccount(id: string) {
  check(await supabase.from('accounts').delete().eq('id', id))
}

export async function listCategories(): Promise<Category[]> {
  return unwrap<Category[]>(
    await supabase
      .from('categories')
      .select('id,user_id,nombre,tipo,icono')
      .order('user_id', { ascending: true, nullsFirst: true })
      .order('nombre'),
  )
}

export async function createCategory(nombre: string, tipo: CategoryType, icono: string | null) {
  const user_id = await currentUserId()
  check(await supabase.from('categories').insert({ user_id, nombre, tipo, icono }))
}

export async function deleteCategory(id: string) {
  check(await supabase.from('categories').delete().eq('id', id))
}

export async function listTransactions(range?: { from: string; to: string }): Promise<Transaction[]> {
  const base = supabase
    .from('transactions')
    .select('id,account_id,cuenta_destino_id,category_id,monto,tipo,fecha,nota')
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
  const query = range ? base.gte('fecha', range.from).lt('fecha', range.to) : base
  const rows = unwrap<Array<Omit<Transaction, 'monto'> & { monto: string | number }>>(await query)
  return rows.map((r) => ({ ...r, monto: Number(r.monto) }))
}

export async function saveTransaction(input: TransactionInput, id?: string) {
  const isTransfer = input.tipo === 'transferencia'
  const payload = {
    ...input,
    cuenta_destino_id: isTransfer ? input.cuenta_destino_id : null,
    category_id: isTransfer ? null : input.category_id,
  }
  check(
    id
      ? await supabase.from('transactions').update(payload).eq('id', id)
      : await supabase.from('transactions').insert(payload),
  )
}

export async function deleteTransaction(id: string) {
  check(await supabase.from('transactions').delete().eq('id', id))
}

export async function listPlanItems(): Promise<PlanItem[]> {
  const rows = unwrap<Array<Omit<PlanItem, 'valor'> & { valor: string | number }>>(
    await supabase
      .from('plan_items')
      .select('id,nombre,grupo,categoria_id,tipo_monto,valor,activo,orden')
      .order('orden')
      .order('nombre'),
  )
  return rows.map((r) => ({ ...r, valor: Number(r.valor) }))
}

export async function savePlanItem(input: PlanItemInput, id?: string) {
  check(
    id
      ? await supabase.from('plan_items').update(input).eq('id', id)
      : await supabase.from('plan_items').insert(input),
  )
}

export async function deletePlanItem(id: string) {
  check(await supabase.from('plan_items').delete().eq('id', id))
}

export async function getSalario(mes: string): Promise<number | null> {
  const rows = unwrap<Array<{ salario: string | number }>>(
    await supabase.from('budget_months').select('salario').eq('mes', `${mes}-01`),
  )
  return rows.length > 0 ? Number(rows[0].salario) : null
}

export async function saveSalario(mes: string, salario: number) {
  const user_id = await currentUserId()
  check(
    await supabase
      .from('budget_months')
      .upsert({ user_id, mes: `${mes}-01`, salario }, { onConflict: 'user_id,mes' }),
  )
}

type EntryRow = Omit<BudgetEntry, 'monto' | 'valor' | 'cuenta_id'> & {
  monto: string | number
  valor: string | number
  transaction: { account_id: string } | null
}

export async function listEntries(mes: string): Promise<BudgetEntry[]> {
  const rows = unwrap<EntryRow[]>(
    await supabase
      .from('budget_entries')
      .select(
        'id,mes,plan_item_id,nombre,grupo,categoria_id,tipo_monto,valor,monto,transaction_id,transaction:transactions(account_id)',
      )
      .eq('mes', `${mes}-01`)
      .order('nombre'),
  )
  return rows.map((r) => ({
    id: r.id,
    mes: r.mes,
    plan_item_id: r.plan_item_id,
    nombre: r.nombre,
    grupo: r.grupo,
    categoria_id: r.categoria_id,
    tipo_monto: r.tipo_monto,
    valor: Number(r.valor),
    monto: Number(r.monto),
    transaction_id: r.transaction_id,
    cuenta_id: r.transaction?.account_id ?? null,
  }))
}

export async function generarMes(mes: string): Promise<number> {
  const { data, error } = await supabase.rpc('generar_mes', { p_mes: `${mes}-01` })
  if (error) throw new Error(error.message)
  return Number(data)
}

export async function setEntryStatus(id: string, cuentaId: string | null) {
  check(await supabase.rpc('set_budget_entry_status', { p_entry: id, p_cuenta: cuentaId }))
}

export async function updateEntry(
  id: string,
  patch: { tipo_monto: MontoTipo; valor: number; monto: number },
) {
  check(await supabase.from('budget_entries').update(patch).eq('id', id))
}

export async function deleteEntry(id: string) {
  check(await supabase.from('budget_entries').delete().eq('id', id))
}

export async function listGoals(): Promise<Goal[]> {
  const rows = unwrap<
    Array<Omit<Goal, 'objetivo' | 'ahorrado'> & { objetivo: string | number; ahorrado: string | number }>
  >(
    await supabase
      .from('goals')
      .select('id,nombre,objetivo,ahorrado,fecha_meta')
      .order('fecha_meta', { ascending: true, nullsFirst: false }),
  )
  return rows.map((r) => ({ ...r, objetivo: Number(r.objetivo), ahorrado: Number(r.ahorrado) }))
}

export async function saveGoal(input: GoalInput, id?: string) {
  check(
    id
      ? await supabase.from('goals').update(input).eq('id', id)
      : await supabase.from('goals').insert(input),
  )
}

export async function deleteGoal(id: string) {
  check(await supabase.from('goals').delete().eq('id', id))
}
