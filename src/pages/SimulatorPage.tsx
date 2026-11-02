import { useState, useMemo } from 'react'
import { Card, Empty, Field, PageHeader, inputCls, primaryBtn } from '../components/ui'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { simularPrestamo } from '../lib/simulator'
import { formatMoney } from '../lib/format'

export function SimulatorPage() {
  const [monto, setMonto] = useState('')
  const [tasa, setTasa] = useState('12')
  const [meses, setMeses] = useState('12')
  const [abono, setAbono] = useState('')
  const [mostrarAbono, setMostrarAbono] = useState(false)

  const montoNum = parseMoney(monto)
  const tasaNum = Number(tasa.replace(',', '.'))
  const mesesNum = Number(meses)

  const resultado = useMemo(() => {
    if (!(montoNum > 0) || !(mesesNum > 0)) return null
    return simularPrestamo(montoNum, tasaNum, mesesNum)
  }, [montoNum, tasaNum, mesesNum])

  const resultadoAbono = useMemo(() => {
    if (!resultado || !mostrarAbono) return null
    const abonoNum = parseMoney(abono)
    if (!(abonoNum > 0)) return null
    const nuevoMonto = Math.max(0, montoNum - abonoNum)
    if (nuevoMonto <= 0) return null
    const nuevo = simularPrestamo(nuevoMonto, tasaNum, mesesNum)
    return {
      ...nuevo,
      ahorroInteres: resultado.interesTotal - nuevo.interesTotal,
      ahorroCuota: resultado.cuota - nuevo.cuota,
    }
  }, [resultado, abono, mostrarAbono, montoNum, tasaNum, mesesNum])

  return (
    <>
      <PageHeader title="Simulador de crédito" />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-ink">Datos del crédito</h2>
          <div className="flex flex-col gap-4">
            <Field label="Monto del crédito">
              <MoneyInput value={monto} onChange={setMonto} className={inputCls} required />
            </Field>
            <Field label="Tasa de interés anual (%)">
              <input inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Plazo (meses)">
              <input inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        {resultado && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-ink">Resultado</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[20px] bg-mist p-4">
                <p className="text-xs text-zinc-500">Cuota mensual</p>
                <p className="mt-1 text-xl font-bold text-ink">{formatMoney(resultado.cuota, 'COP')}</p>
              </div>
              <div className="rounded-[20px] bg-mist p-4">
                <p className="text-xs text-zinc-500">Total a pagar</p>
                <p className="mt-1 text-xl font-bold text-ink">{formatMoney(resultado.totalPagar, 'COP')}</p>
              </div>
              <div className="rounded-[20px] bg-red-50 p-4">
                <p className="text-xs text-red-500">Interés total</p>
                <p className="mt-1 text-xl font-bold text-red-600">{formatMoney(resultado.interesTotal, 'COP')}</p>
              </div>
              <div className="rounded-[20px] bg-mist p-4">
                <p className="text-xs text-zinc-500">Cuotas</p>
                <p className="mt-1 text-xl font-bold text-ink">{mesesNum}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Simular abono a capital</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <MoneyInput value={abono} onChange={setAbono} className={inputCls} />
                </div>
                <button type="button" onClick={() => setMostrarAbono(true)} className={primaryBtn}>
                  Simular
                </button>
              </div>
            </div>

            {resultadoAbono && (
              <div className="mt-4 rounded-[24px] bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-800">
                  Con abono de {formatMoney(parseMoney(abono), 'COP')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Nueva cuota</p>
                    <p className="font-semibold text-ink">{formatMoney(resultadoAbono.cuota, 'COP')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Nuevo total</p>
                    <p className="font-semibold text-ink">{formatMoney(resultadoAbono.totalPagar, 'COP')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Ahorro en cuota</p>
                    <p className="font-semibold text-emerald-600">{formatMoney(resultadoAbono.ahorroCuota, 'COP')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Ahorro en interés</p>
                    <p className="font-semibold text-emerald-600">{formatMoney(resultadoAbono.ahorroInteres, 'COP')}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {resultado && (
          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-ink">Plan de pagos</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="pb-2 text-left">Mes</th>
                    <th className="pb-2 text-right">Cuota</th>
                    <th className="pb-2 text-right">Capital</th>
                    <th className="pb-2 text-right">Interés</th>
                    <th className="pb-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.amortizacion.map((a) => (
                    <tr key={a.mes} className="border-b border-zinc-100">
                      <td className="py-2">{a.mes}</td>
                      <td className="py-2 text-right">{formatMoney(a.cuota, 'COP')}</td>
                      <td className="py-2 text-right">{formatMoney(a.capital, 'COP')}</td>
                      <td className="py-2 text-right">{formatMoney(a.interes, 'COP')}</td>
                      <td className="py-2 text-right">{formatMoney(a.saldo, 'COP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!resultado && (
          <Card className="lg:col-span-2">
            <Empty>Ingresa el monto, la tasa y el plazo para ver la simulación.</Empty>
          </Card>
        )}
      </div>
    </>
  )
}
