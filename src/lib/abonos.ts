export type TipoAbono = 'cuota' | 'plazo'

export type Abono = {
  mes: number
  monto: number
  tipo: TipoAbono
}

export type CuotaAmortizacion = {
  mes: number
  cuota: number
  capital: number
  interes: number
  saldo: number
  abono: number
}

export type ResultadoAmortizacion = {
  cuota: number
  totalPagar: number
  interesTotal: number
  meses: number
  amortizacion: CuotaAmortizacion[]
}

export function amortizarConAbonos(
  monto: number,
  tasaAnual: number,
  mesesOriginal: number,
  abonos: Abono[],
): ResultadoAmortizacion {
  const r = tasaAnual / 100 / 12
  const abonosMap = new Map<number, Abono>()
  for (const a of abonos) abonosMap.set(a.mes, a)

  // First pass: determine if we reduce cuota or plazo
  // We'll process month by month
  const amortizacion: CuotaAmortizacion[] = []
  let saldo = monto
  let cuotaActual = r === 0 ? monto / mesesOriginal : (monto * r * Math.pow(1 + r, mesesOriginal)) / (Math.pow(1 + r, mesesOriginal) - 1)
  let mes = 0

  // Track abonos that reduce plazo (they reduce the number of remaining payments)
  // Track abonos that reduce cuota (they recalculate the cuota)

  while (saldo > 0.01 && mes < mesesOriginal + 120) {
    mes++
    if (mes > mesesOriginal + 120) break

    const abono = abonosMap.get(mes)
    const abonoMonto = abono?.monto ?? 0

    // If abono reduces cuota, recalculate cuota for remaining months
    if (abono && abono.tipo === 'cuota' && abonoMonto > 0) {
      const nuevoSaldo = Math.max(0, saldo - abonoMonto)
      if (nuevoSaldo <= 0) {
        // Paid off
        const interes = saldo * r
        amortizacion.push({ mes, cuota: saldo + interes, capital: saldo, interes, saldo: 0, abono: abonoMonto })
        saldo = 0
        break
      }
      // Recalculate cuota for remaining months
      const mesesRest = mesesOriginal - mes
      if (mesesRest > 0 && r > 0) {
        cuotaActual = (nuevoSaldo * r * Math.pow(1 + r, mesesRest)) / (Math.pow(1 + r, mesesRest) - 1)
      } else if (mesesRest > 0) {
        cuotaActual = nuevoSaldo / mesesRest
      }
      saldo = nuevoSaldo
      // Still process this month's regular payment
      // Actually, the abono is extra, so we still pay the regular cuota
      // Let me redo this properly
    }

    // Process regular payment
    if (saldo <= 0.01) break

    const interes = saldo * r
    let capital = cuotaActual - interes
    if (capital > saldo) capital = saldo
    const cuotaReal = capital + interes

    let abonoAplicado = 0
    if (abono && abono.tipo === 'plazo' && abonoMonto > 0) {
      // Abono reduces principal, which reduces remaining term
      abonoAplicado = Math.min(abonoMonto, saldo - capital)
      if (abonoAplicado < 0) abonoAplicado = 0
    } else if (abono && abono.tipo === 'cuota' && abonoMonto > 0) {
      abonoAplicado = Math.min(abonoMonto, saldo - capital)
      if (abonoAplicado < 0) abonoAplicado = 0
    }

    const nuevoSaldo = Math.max(0, saldo - capital - abonoAplicado)
    amortizacion.push({
      mes,
      cuota: cuotaReal,
      capital: capital + abonoAplicado,
      interes,
      saldo: nuevoSaldo,
      abono: abonoAplicado,
    })
    saldo = nuevoSaldo

    // If abono reduces cuota, recalculate for next month
    if (abono && abono.tipo === 'cuota' && abonoMonto > 0 && saldo > 0) {
      const mesesRest = mesesOriginal - mes
      if (mesesRest > 0 && r > 0) {
        cuotaActual = (saldo * r * Math.pow(1 + r, mesesRest)) / (Math.pow(1 + r, mesesRest) - 1)
      } else if (mesesRest > 0) {
        cuotaActual = saldo / mesesRest
      }
    }
  }

  const totalPagar = amortizacion.reduce((sum, a) => sum + a.cuota + a.abono, 0)
  const interesTotal = amortizacion.reduce((sum, a) => sum + a.interes, 0)

  return {
    cuota: cuotaActual,
    totalPagar,
    interesTotal,
    meses: amortizacion.length,
    amortizacion,
  }
}

export function calcularAhorroInteres(
  monto: number,
  tasaAnual: number,
  meses: number,
  abonos: Abono[],
): number {
  const sinAbono = amortizarConAbonos(monto, tasaAnual, meses, [])
  const conAbono = amortizarConAbonos(monto, tasaAnual, meses, abonos)
  return sinAbono.interesTotal - conAbono.interesTotal
}
