import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Account,
  AccountInput,
  Budget,
  Category,
  CategoryType,
  Goal,
  GoalInput,
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
  return unwrap<Profile>(await supabase.from('profiles').select('id,nombre,moneda').single())
}

export async function updateProfile(patch: { nombre?: string; moneda?: string }) {
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

export async function listBudgets(mes: string): Promise<Budget[]> {
  const rows = unwrap<Array<Omit<Budget, 'limite'> & { limite: string | number }>>(
    await supabase
      .from('budgets')
      .select('id,category_id,mes,limite')
      .eq('mes', `${mes}-01`),
  )
  return rows.map((r) => ({ ...r, limite: Number(r.limite) }))
}

export async function upsertBudget(categoryId: string, mes: string, limite: number) {
  const user_id = await currentUserId()
  check(
    await supabase.from('budgets').upsert(
      { user_id, category_id: categoryId, mes: `${mes}-01`, limite },
      { onConflict: 'user_id,category_id,mes' },
    ),
  )
}

export async function deleteBudget(id: string) {
  check(await supabase.from('budgets').delete().eq('id', id))
}

export async function listGoals(): Promise<Goal[]> {
  const rows = unwrap<Array<Omit<Goal, 'objetivo' | 'ahorrado'> & { objetivo: string | number; ahorrado: string | number }>>(
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
