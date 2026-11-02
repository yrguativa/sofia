import { describe, expect, it } from 'vitest'
import { montoDesde, resumenPresupuesto } from './presupuesto'
import type { BudgetEntry } from './types'

function entry(partial: Partial<BudgetEntry>): BudgetEntry {
  return {
    id: Math.random().toString(),
    mes: '2026-11-01',
    plan_item_id: null,
    nombre: 'Ítem',
    grupo: 'Gastos fijos',
    categoria_id: null,
    tipo_monto: 'valor',
    valor: 0,
    monto: 0,
    transaction_id: null,
    cuenta_id: null,
    ...partial,
  }
}

describe('montoDesde', () => {
  it('calcula el porcentaje sobre el salario', () => {
    expect(montoDesde('porcentaje', 10, 11_904_405)).toBe(1_190_440.5)
    expect(montoDesde('porcentaje', 5, 11_904_405)).toBe(595_220.25)
  })

  it('devuelve el valor fijo sin cambios', () => {
    expect(montoDesde('valor', 400_000, 11_904_405)).toBe(400_000)
  })

  it('recalcula al cambiar el porcentaje', () => {
    expect(montoDesde('porcentaje', 12, 1_000_000)).toBe(120_000)
  })
})

describe('resumenPresupuesto', () => {
  it('separa planificado, pagado y pendiente', () => {
    const r = resumenPresupuesto(1_000_000, [
      entry({ monto: 300_000, transaction_id: 'tx1' }),
      entry({ monto: 200_000 }),
    ])
    expect(r.planificado).toBe(500_000)
    expect(r.pagado).toBe(300_000)
    expect(r.pendiente).toBe(200_000)
    expect(r.sinAsignar).toBe(500_000)
  })

  it('agrupa por grupo para reportes', () => {
    const r = resumenPresupuesto(0, [
      entry({ grupo: 'Deudas', monto: 100, transaction_id: 'tx' }),
      entry({ grupo: 'Deudas', monto: 50 }),
      entry({ grupo: 'Ahorros', monto: 25 }),
    ])
    expect(r.porGrupo.Deudas).toEqual({ planificado: 150, pagado: 100 })
    expect(r.porGrupo.Ahorros).toEqual({ planificado: 25, pagado: 0 })
  })
})
