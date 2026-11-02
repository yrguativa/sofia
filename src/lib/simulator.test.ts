import { describe, expect, it } from 'vitest'
import { distribucion503020, mesesParaMeta, simularAhorro, simularPrestamo } from './simulator'

describe('simularPrestamo', () => {
  it('calcula cuota para préstamo sin interés', () => {
    const r = simularPrestamo(1200, 0, 12)
    expect(r.cuota).toBe(100)
    expect(r.interesTotal).toBe(0)
    expect(r.totalPagar).toBe(1200)
  })

  it('calcula cuota con interés', () => {
    const r = simularPrestamo(1000000, 12, 12)
    expect(r.cuota).toBeCloseTo(88848.8, 0)
    expect(r.interesTotal).toBeGreaterThan(0)
    expect(r.amortizacion).toHaveLength(12)
  })

  it('saldo final es cero', () => {
    const r = simularPrestamo(500000, 10, 6)
    expect(r.amortizacion[5].saldo).toBeCloseTo(0, 2)
  })
})

describe('simularAhorro', () => {
  it('alcanza la meta', () => {
    const r = simularAhorro(1000, 100, 0)
    expect(r.meses).toBe(10)
    expect(r.totalAportado).toBe(1000)
  })

  it('gana interés', () => {
    const r = simularAhorro(10000, 500, 12, 36)
    expect(r.interesGanado).toBeGreaterThan(0)
    expect(r.meses).toBeLessThanOrEqual(36)
  })
})

describe('mesesParaMeta', () => {
  it('calcula meses sin interés', () => {
    expect(mesesParaMeta(1000, 100, 0)).toBe(10)
  })
})

describe('distribucion503020', () => {
  it('distribuye correctamente', () => {
    const r = distribucion503020(1000000)
    expect(r.necesidades).toBe(500000)
    expect(r.deseos).toBe(300000)
    expect(r.ahorro).toBe(200000)
  })
})
