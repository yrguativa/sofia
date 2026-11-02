import { describe, expect, it } from 'vitest'
import { computeBalances, summarize } from './finance'
import { monthRange, shiftMonth } from './format'
import type { Account, Transaction } from './types'

const accounts: Account[] = [
  { id: 'a', nombre: 'Banco', tipo: 'banco', saldo_inicial: 1000 },
  { id: 'b', nombre: 'Efectivo', tipo: 'efectivo', saldo_inicial: 100 },
]

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    account_id: 'a',
    cuenta_destino_id: null,
    category_id: null,
    monto: 0,
    tipo: 'gasto',
    fecha: '2026-11-02',
    nota: null,
    ...partial,
  }
}

describe('computeBalances', () => {
  it('suma ingresos y resta gastos sobre el saldo inicial', () => {
    const balances = computeBalances(accounts, [
      tx({ tipo: 'ingreso', monto: 500 }),
      tx({ tipo: 'gasto', monto: 200 }),
    ])
    expect(balances.a).toBe(1300)
    expect(balances.b).toBe(100)
  })

  it('mueve el dinero entre cuentas en una transferencia', () => {
    const balances = computeBalances(accounts, [
      tx({ tipo: 'transferencia', monto: 300, account_id: 'a', cuenta_destino_id: 'b' }),
    ])
    expect(balances.a).toBe(700)
    expect(balances.b).toBe(400)
  })
})

describe('summarize', () => {
  it('no cuenta las transferencias como ingreso ni gasto', () => {
    const result = summarize([
      tx({ tipo: 'ingreso', monto: 1000 }),
      tx({ tipo: 'gasto', monto: 250 }),
      tx({ tipo: 'transferencia', monto: 999, cuenta_destino_id: 'b' }),
    ])
    expect(result).toEqual({ ingresos: 1000, gastos: 250 })
  })
})

describe('fechas', () => {
  it('shiftMonth cruza años', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
  })

  it('monthRange devuelve el rango [inicio, inicio del mes siguiente)', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-03-01' })
  })
})
