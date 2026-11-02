export type AccountType = 'efectivo' | 'banco' | 'tarjeta' | 'ahorro'
export type TxType = 'ingreso' | 'gasto' | 'transferencia'
export type CategoryType = 'ingreso' | 'gasto'

export type Profile = {
  id: string
  nombre: string | null
  moneda: string
  dia_pago: number
}

export type Account = {
  id: string
  nombre: string
  tipo: AccountType
  saldo_inicial: number
}

export type AccountInput = Omit<Account, 'id'>

export type Category = {
  id: string
  user_id: string | null
  nombre: string
  tipo: CategoryType
  icono: string | null
}

export type Transaction = {
  id: string
  account_id: string
  cuenta_destino_id: string | null
  category_id: string | null
  monto: number
  tipo: TxType
  fecha: string
  nota: string | null
}

export type TransactionInput = Omit<Transaction, 'id'>

export type PlanGrupo = 'Gastos fijos' | 'Gastos variables' | 'Deudas' | 'Ahorros'
export const grupos: PlanGrupo[] = ['Gastos fijos', 'Gastos variables', 'Deudas', 'Ahorros']

export type MontoTipo = 'valor' | 'porcentaje'

export type PlanItem = {
  id: string
  nombre: string
  grupo: PlanGrupo
  categoria_id: string | null
  tipo_monto: MontoTipo
  valor: number
  activo: boolean
  orden: number
  debt_id: string | null
}

export type PlanItemInput = Omit<PlanItem, 'id'>

export type BudgetEntry = {
  id: string
  mes: string
  plan_item_id: string | null
  nombre: string
  grupo: PlanGrupo
  categoria_id: string | null
  tipo_monto: MontoTipo
  valor: number
  monto: number
  transaction_id: string | null
  cuenta_id: string | null
  metodo_pago: 'pago' | 'bolsillo' | null
  debt_id: string | null
}

export type Goal = {
  id: string
  nombre: string
  objetivo: number
  ahorrado: number
  fecha_meta: string | null
}

export type GoalInput = Omit<Goal, 'id'>

export type Debt = {
  id: string
  nombre: string
  monto_total: number
  tasa_interes: number
  cuotas: number
  cuota_mensual: number
  fecha_inicio: string
  saldo_pendiente: number
  plan_item_id: string | null
}

export type DebtInput = Omit<Debt, 'id' | 'saldo_pendiente'> & { saldo_pendiente?: number }
