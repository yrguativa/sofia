export function normalizeMoneyInput(raw: string): string {
  const limpio = raw.replace(/[^\d,.]/g, '')
  if (limpio.includes(',')) {
    const [entero, ...resto] = limpio.split(',')
    const decimales = resto.join('').replace(/[.,]/g, '').slice(0, 2)
    return `${entero.replace(/\./g, '')}.${decimales}`
  }
  return limpio.replace(/\./g, '')
}

export function formatMoneyInput(canonico: string): string {
  if (canonico === '') return ''
  const [entero, decimales] = canonico.split('.')
  const grupos = (entero || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$ ${grupos}${decimales !== undefined ? `,${decimales}` : ''}`
}

export function parseMoney(canonico: string): number {
  const n = Number(canonico)
  return Number.isFinite(n) ? n : 0
}
