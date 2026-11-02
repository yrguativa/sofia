export type LoanResult = {
  cuota: number
  totalPagar: number
  interesTotal: number
  amortizacion: Array<{ mes: number; cuota: number; capital: number; interes: number; saldo: number }>
}

export function simularPrestamo(monto: number, tasaAnual: number, meses: number): LoanResult {
  const r = tasaAnual / 100 / 12
  if (r === 0) {
    const cuota = monto / meses
    return {
      cuota,
      totalPagar: cuota * meses,
      interesTotal: 0,
      amortizacion: Array.from({ length: meses }, (_, i) => ({
        mes: i + 1,
        cuota,
        capital: cuota,
        interes: 0,
        saldo: monto - cuota * (i + 1),
      })),
    }
  }
  const cuota = (monto * r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1)
  const amortizacion: LoanResult['amortizacion'] = []
  let saldo = monto
  for (let i = 1; i <= meses; i++) {
    const interes = saldo * r
    const capital = cuota - interes
    saldo = Math.max(0, saldo - capital)
    amortizacion.push({ mes: i, cuota, capital, interes, saldo })
  }
  const totalPagar = cuota * meses
  return { cuota, totalPagar, interesTotal: totalPagar - monto, amortizacion }
}

export type AhorroResult = {
  meta: number
  aporteMensual: number
  tasaAnual: number
  meses: number
  totalAportado: number
  interesGanado: number
  proyeccion: Array<{ mes: number; aporte: number; acumulado: number; interes: number }>
}

export function simularAhorro(
  meta: number,
  aporteMensual: number,
  tasaAnual: number,
  mesesMax = 360,
): AhorroResult {
  const r = tasaAnual / 100 / 12
  const proyeccion: AhorroResult['proyeccion'] = []
  let acumulado = 0
  let mes = 0
  while (acumulado < meta && mes < mesesMax) {
    mes++
    const interes = acumulado * r
    acumulado += aporteMensual + interes
    proyeccion.push({ mes, aporte: aporteMensual, acumulado, interes })
  }
  const totalAportado = aporteMensual * mes
  return {
    meta,
    aporteMensual,
    tasaAnual,
    meses: mes,
    totalAportado,
    interesGanado: acumulado - totalAportado,
    proyeccion,
  }
}

export function mesesParaMeta(meta: number, aporteMensual: number, tasaAnual: number): number {
  const r = tasaAnual / 100 / 12
  if (r === 0) return Math.ceil(meta / aporteMensual)
  return Math.ceil(Math.log(1 + (meta * r) / aporteMensual) / Math.log(1 + r))
}

export type Distribucion503020 = {
  ingreso: number
  necesidades: number
  deseos: number
  ahorro: number
}

export function distribucion503020(ingreso: number): Distribucion503020 {
  return {
    ingreso,
    necesidades: ingreso * 0.5,
    deseos: ingreso * 0.3,
    ahorro: ingreso * 0.2,
  }
}
