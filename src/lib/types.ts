export type AccountType = 'efectivo' | 'banco' | 'tarjeta' | 'ahorro'
export type TxType = 'ingreso' | 'gasto' | 'transferencia'
export type CategoryType = 'ingreso' | 'gasto'

export type Profile = {
  id: string
  nombre: string | null
  moneda: string
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

export type Budget = {
  id: string
  category_id: string
  mes: string
  limite: number
}

export type Goal = {
  id: string
  nombre: string
  objetivo: number
  ahorrado: number
  fecha_meta: string | null
}

export type GoalInput = Omit<Goal, 'id'>
