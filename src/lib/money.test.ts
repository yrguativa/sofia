import { describe, expect, it } from 'vitest'
import { formatMoneyInput, normalizeMoneyInput, parseMoney } from './money'

describe('normalizeMoneyInput', () => {
  it('quita símbolo y separadores de miles', () => {
    expect(normalizeMoneyInput('$ 1.234.567')).toBe('1234567')
  })

  it('usa la coma como decimal', () => {
    expect(normalizeMoneyInput('1.234,5')).toBe('1234.5')
    expect(normalizeMoneyInput('1234,')).toBe('1234.')
  })

  it('limita a dos decimales', () => {
    expect(normalizeMoneyInput('10,999')).toBe('10.99')
  })
})

describe('formatMoneyInput', () => {
  it('agrupa miles con punto', () => {
    expect(formatMoneyInput('11904405')).toBe('$ 11.904.405')
  })

  it('muestra la coma mientras el usuario escribe decimales', () => {
    expect(formatMoneyInput('1234.')).toBe('$ 1.234,')
    expect(formatMoneyInput('1190440.5')).toBe('$ 1.190.440,5')
  })

  it('devuelve vacío sin valor', () => {
    expect(formatMoneyInput('')).toBe('')
  })
})

describe('parseMoney', () => {
  it('convierte el valor canónico a número', () => {
    expect(parseMoney('1190440.5')).toBe(1190440.5)
    expect(parseMoney('')).toBe(0)
  })
})
