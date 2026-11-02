export function formatMoney(value: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function currentMonth() {
  return todayISO().slice(0, 7)
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthRange(ym: string) {
  return { from: `${ym}-01`, to: `${shiftMonth(ym, 1)}-01` }
}

export function mesDePresupuesto(hoy: Date, diaPago: number) {
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  const ultimoDia = new Date(y, m + 1, 0).getDate()
  const diaDeCobro = Math.min(diaPago, ultimoDia)
  const base = hoy.getDate() < diaDeCobro ? new Date(y, m - 1, 1) : new Date(y, m, 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

export function monthOf(isoDate: string) {
  return isoDate.slice(0, 7)
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function dayLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
