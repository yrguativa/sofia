import type { BudgetEntry, MontoTipo } from './types'

export function montoDesde(tipo: MontoTipo, valor: number, salario: number) {
  return tipo === 'porcentaje' ? Math.round(((salario * valor) / 100) * 100) / 100 : valor
}

export function resumenPresupuesto(salario: number, entries: BudgetEntry[]) {
  let planificado = 0
  let pagado = 0
  const porGrupo: Record<string, { planificado: number; pagado: number }> = {}

  for (const e of entries) {
    const esPagado = e.transaction_id !== null
    planificado += e.monto
    if (esPagado) pagado += e.monto

    const grupo = (porGrupo[e.grupo] ??= { planificado: 0, pagado: 0 })
    grupo.planificado += e.monto
    if (esPagado) grupo.pagado += e.monto
  }

  return {
    planificado,
    pagado,
    pendiente: planificado - pagado,
    sinAsignar: salario - planificado,
    porGrupo,
  }
}
