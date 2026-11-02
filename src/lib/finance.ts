import type { Account, Transaction } from './types'

export function computeBalances(accounts: Account[], transactions: Transaction[]) {
  const balances: Record<string, number> = {}
  for (const a of accounts) balances[a.id] = a.saldo_inicial

  for (const t of transactions) {
    if (t.tipo === 'ingreso') {
      balances[t.account_id] = (balances[t.account_id] ?? 0) + t.monto
    } else if (t.tipo === 'gasto') {
      balances[t.account_id] = (balances[t.account_id] ?? 0) - t.monto
    } else {
      balances[t.account_id] = (balances[t.account_id] ?? 0) - t.monto
      if (t.cuenta_destino_id) {
        balances[t.cuenta_destino_id] = (balances[t.cuenta_destino_id] ?? 0) + t.monto
      }
    }
  }

  return balances
}

export function summarize(transactions: Transaction[]) {
  let ingresos = 0
  let gastos = 0
  for (const t of transactions) {
    if (t.tipo === 'ingreso') ingresos += t.monto
    else if (t.tipo === 'gasto') gastos += t.monto
  }
  return { ingresos, gastos }
}

export function spentByCategory(transactions: Transaction[]) {
  const spent: Record<string, number> = {}
  for (const t of transactions) {
    if (t.tipo === 'gasto' && t.category_id) {
      spent[t.category_id] = (spent[t.category_id] ?? 0) + t.monto
    }
  }
  return spent
}
