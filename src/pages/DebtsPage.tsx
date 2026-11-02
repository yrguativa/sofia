import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, dangerBtn, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { deleteDebt, getProfile, listDebts, saveDebt } from '../lib/db'
import { formatMoney } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'
import type { Debt } from '../lib/types'
import { simularPrestamo } from '../lib/simulator'

export function DebtsPage() {
  const [sheet, setSheet] = useState<Debt | 'new' | null>(null)
  const [simulando, setSimulando] = useState<Debt | null>(null)

  const loader = useCallback(async () => {
    const [profile, debts] = await Promise.all([getProfile(), listDebts()])
    return { profile, debts }
  }, [])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const moneda = data.profile.moneda

  return (
    <>
      <PageHeader
        title="Deudas"
        action={
          <button type="button" onClick={() => setSheet('new')} className={primaryBtn}>
            <Icon className="h-4 w-4">{icons.plus}</Icon>
            Nueva
          </button>
        }
      />

      {data.debts.length === 0 ? (
        <Empty>Registra tus deudas para hacer seguimiento de pagos.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {data.debts.map((d) => {
            const pct = d.monto_total > 0 ? ((d.monto_total - d.saldo_pendiente) / d.monto_total) * 100 : 0
            return (
              <Card key={d.id} className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Icon className="h-5 w-5">{icons.tarjeta}</Icon>
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{d.nombre}</p>
                      <p className="text-xs text-zinc-500">
                        {d.cuotas} cuotas · {d.tasa_interes}% anual
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimulando(d)}
                    className={`${secondaryBtn} py-2 text-xs`}
                  >
                    Simular
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Monto total</p>
                    <p className="font-medium text-ink">{formatMoney(d.monto_total, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Saldo pendiente</p>
                    <p className="font-medium text-red-600">{formatMoney(d.saldo_pendiente, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Cuota mensual</p>
                    <p className="font-medium text-ink">{formatMoney(d.cuota_mensual, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Pagado</p>
                    <p className="font-medium text-emerald-600">{formatMoney(d.monto_total - d.saldo_pendiente, moneda)}</p>
                  </div>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="text-xs text-zinc-500">{Math.round(pct)}% pagado</p>

                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setSheet(d)} className={`${secondaryBtn} flex-1 py-2 text-sm`}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`¿Eliminar "${d.nombre}"?`)) return
                      await deleteDebt(d.id)
                      reload()
                    }}
                    className={`${dangerBtn} py-2 text-sm`}
                  >
                    Eliminar
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {sheet && (
        <Sheet title={sheet === 'new' ? 'Nueva deuda' : 'Editar deuda'} onClose={() => setSheet(null)}>
          <DebtForm debt={sheet === 'new' ? null : sheet} onSaved={() => { setSheet(null); reload() }} />
        </Sheet>
      )}

      {simulando && (
        <Sheet title={`Simulación: ${simulando.nombre}`} onClose={() => setSimulando(null)}>
          <SimulacionDeuda debt={simulando} moneda={moneda} />
        </Sheet>
      )}
    </>
  )
}

function DebtForm({ debt, onSaved }: { debt: Debt | null; onSaved: () => void }) {
  const [nombre, setNombre] = useState(debt?.nombre ?? '')
  const [montoTotal, setMontoTotal] = useState(debt ? String(debt.monto_total) : '')
  const [tasa, setTasa] = useState(debt ? String(debt.tasa_interes) : '0')
  const [cuotas, setCuotas] = useState(debt ? String(debt.cuotas) : '12')
  const [cuotaMensual, setCuotaMensual] = useState(debt ? String(debt.cuota_mensual) : '')
  const [fechaInicio, setFechaInicio] = useState(debt?.fecha_inicio ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-calculate cuota if not set
  const monto = parseMoney(montoTotal)
  const tasaNum = Number(tasa.replace(',', '.'))
  const cuotasNum = Number(cuotas)
  const cuotaCalculada = monto > 0 && cuotasNum > 0 ? simularPrestamo(monto, tasaNum, cuotasNum).cuota : 0

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const m = parseMoney(montoTotal)
    const c = Number(cuotas)
    const cm = parseMoney(cuotaMensual) || cuotaCalculada
    if (!(m > 0)) return setError('El monto debe ser mayor que cero.')
    if (!(c > 0)) return setError('Las cuotas deben ser mayor que cero.')
    setSaving(true)
    try {
      await saveDebt(
        {
          nombre: nombre.trim(),
          monto_total: m,
          tasa_interes: tasaNum,
          cuotas: c,
          cuota_mensual: cm,
          fecha_inicio: fechaInicio,
          saldo_pendiente: debt?.saldo_pendiente ?? m,
          plan_item_id: null,
        },
        debt?.id,
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!debt) return
    if (!window.confirm(`¿Eliminar "${debt.nombre}"?`)) return
    setSaving(true)
    try {
      await deleteDebt(debt.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} className={inputCls} required />
      </Field>
      <Field label="Monto total">
        <MoneyInput value={montoTotal} onChange={setMontoTotal} className={inputCls} required />
      </Field>
      <Field label="Tasa de interés anual (%)">
        <input inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Número de cuotas">
        <input inputMode="numeric" value={cuotas} onChange={(e) => setCuotas(e.target.value)} className={inputCls} required />
      </Field>
      <Field label="Cuota mensual" hint={cuotaCalculada > 0 ? `Sugerida: ${formatMoney(cuotaCalculada, 'COP')}` : undefined}>
        <MoneyInput value={cuotaMensual} onChange={setCuotaMensual} className={inputCls} />
      </Field>
      <Field label="Fecha de inicio">
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} required />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {debt && (
        <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
          Eliminar deuda
        </button>
      )}
    </form>
  )
}

function SimulacionDeuda({ debt, moneda }: { debt: Debt; moneda: string }) {
  const [abono, setAbono] = useState('')
  const [mostrar, setMostrar] = useState(false)

  const base = simularPrestamo(debt.monto_total, debt.tasa_interes, debt.cuotas)
  const abonoNum = parseMoney(abono)

  // Simulate with extra payment: reduce principal
  function simularConAbono() {
    if (abonoNum <= 0) return
    // Simple: reduce total by abono, recalculate
    setMostrar(true)
  }

  const resultadoAbono = mostrar && abonoNum > 0
    ? simularPrestamo(Math.max(0, debt.monto_total - abonoNum), debt.tasa_interes, debt.cuotas)
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[24px] bg-mist p-5">
        <p className="text-sm text-zinc-500">Plan base</p>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Cuota mensual</p>
            <p className="font-semibold text-ink">{formatMoney(base.cuota, moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total a pagar</p>
            <p className="font-semibold text-ink">{formatMoney(base.totalPagar, moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Interés total</p>
            <p className="font-semibold text-red-600">{formatMoney(base.interesTotal, moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cuotas</p>
            <p className="font-semibold text-ink">{debt.cuotas}</p>
          </div>
        </div>
      </div>

      <Field label="Abono extra (capital)">
        <MoneyInput value={abono} onChange={setAbono} className={inputCls} />
      </Field>
      <button type="button" onClick={simularConAbono} className={secondaryBtn}>
        Simular abono
      </button>

      {resultadoAbono && (
        <div className="rounded-[24px] bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-800">Con abono de {formatMoney(abonoNum, moneda)}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Nuevo saldo</p>
              <p className="font-semibold text-ink">{formatMoney(debt.monto_total - abonoNum, moneda)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Nueva cuota</p>
              <p className="font-semibold text-ink">{formatMoney(resultadoAbono.cuota, moneda)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Nuevo total</p>
              <p className="font-semibold text-ink">{formatMoney(resultadoAbono.totalPagar, moneda)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ahorro en interés</p>
              <p className="font-semibold text-emerald-600">{formatMoney(base.interesTotal - resultadoAbono.interesTotal, moneda)}</p>
            </div>
          </div>
        </div>
      )}

      <details className="rounded-[24px] bg-white p-4 shadow-sm">
        <summary className="cursor-pointer font-medium text-ink">Ver plan de pagos base</summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="pb-2 text-left">Mes</th>
                <th className="pb-2 text-right">Cuota</th>
                <th className="pb-2 text-right">Capital</th>
                <th className="pb-2 text-right">Interés</th>
                <th className="pb-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {base.amortizacion.map((a) => (
                <tr key={a.mes} className="border-b border-zinc-100">
                  <td className="py-1.5">{a.mes}</td>
                  <td className="py-1.5 text-right">{formatMoney(a.cuota, moneda)}</td>
                  <td className="py-1.5 text-right">{formatMoney(a.capital, moneda)}</td>
                  <td className="py-1.5 text-right">{formatMoney(a.interes, moneda)}</td>
                  <td className="py-1.5 text-right">{formatMoney(a.saldo, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
