import { useCallback, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, ErrorText, Field, Loading, PageHeader, dangerBtn, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { deleteDebt, getProfile, listDebts, saveDebt } from '../lib/db'
import { formatMoney } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'
import { Sheet } from '../components/Sheet'
import type { Debt } from '../lib/types'
import { simularPrestamo } from '../lib/simulator'

export function DebtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [abono, setAbono] = useState('')
  const [mostrarAbono, setMostrarAbono] = useState(false)

  const loader = useCallback(async () => {
    const [profile, debts] = await Promise.all([getProfile(), listDebts()])
    const debt = debts.find((d) => d.id === id)
    if (!debt) throw new Error('Deuda no encontrada')
    return { profile, debt }
  }, [id])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const { profile, debt } = data
  const moneda = profile.moneda
  const pct = debt.monto_total > 0 ? ((debt.monto_total - debt.saldo_pendiente) / debt.monto_total) * 100 : 0
  const resultado = simularPrestamo(debt.monto_total, debt.tasa_interes, debt.cuotas)
  const resultadoAbono = mostrarAbono && parseMoney(abono) > 0
    ? simularPrestamo(Math.max(0, debt.monto_total - parseMoney(abono)), debt.tasa_interes, debt.cuotas)
    : null
  const abonoNum = parseMoney(abono)

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${debt.nombre}"?`)) return
    await deleteDebt(debt.id)
    navigate('/deudas')
  }

  return (
    <>
      <PageHeader
        title={debt.nombre}
        action={
          <button type="button" onClick={() => navigate('/deudas')} className={secondaryBtn}>
            <Icon className="h-4 w-4">{icons.chevronLeft}</Icon>
            Volver
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Icon className="h-6 w-6">{icons.tarjeta}</Icon>
            </span>
            <div>
              <p className="text-xs text-zinc-500">{debt.cuotas} cuotas · {debt.tasa_interes}% anual</p>
              <p className="text-xs text-zinc-500">Inicio: {debt.fecha_inicio}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-mist p-4">
              <p className="text-xs text-zinc-500">Monto total</p>
              <p className="mt-1 font-bold text-ink">{formatMoney(debt.monto_total, moneda)}</p>
            </div>
            <div className="rounded-[20px] bg-red-50 p-4">
              <p className="text-xs text-red-500">Saldo pendiente</p>
              <p className="mt-1 font-bold text-red-600">{formatMoney(debt.saldo_pendiente, moneda)}</p>
            </div>
            <div className="rounded-[20px] bg-mist p-4">
              <p className="text-xs text-zinc-500">Cuota mensual</p>
              <p className="mt-1 font-bold text-ink">{formatMoney(debt.cuota_mensual, moneda)}</p>
            </div>
            <div className="rounded-[20px] bg-emerald-50 p-4">
              <p className="text-xs text-emerald-600">Pagado</p>
              <p className="mt-1 font-bold text-emerald-600">{formatMoney(debt.monto_total - debt.saldo_pendiente, moneda)}</p>
            </div>
          </div>

          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="text-xs text-zinc-500">{Math.round(pct)}% pagado</p>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn} flex-1 gap-2`}>
              <Icon className="h-4 w-4">{icons.editar}</Icon>
              Editar
            </button>
            <button type="button" onClick={handleDelete} className={`${dangerBtn} flex-1`}>
              Eliminar
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-ink">Simular abono a capital</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <MoneyInput value={abono} onChange={setAbono} className={inputCls} />
            </div>
            <button type="button" onClick={() => setMostrarAbono(true)} className={primaryBtn}>
              Simular
            </button>
          </div>

          {resultadoAbono && (
            <div className="mt-4 rounded-[24px] bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">
                Con abono de {formatMoney(abonoNum, moneda)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
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
                  <p className="font-semibold text-emerald-600">{formatMoney(resultado.interesTotal - resultadoAbono.interesTotal, moneda)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Plan de pagos</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div className="rounded-[20px] bg-mist p-3">
            <p className="text-xs text-zinc-500">Cuota mensual</p>
            <p className="font-semibold text-ink">{formatMoney(resultado.cuota, moneda)}</p>
          </div>
          <div className="rounded-[20px] bg-mist p-3">
            <p className="text-xs text-zinc-500">Total a pagar</p>
            <p className="font-semibold text-ink">{formatMoney(resultado.totalPagar, moneda)}</p>
          </div>
          <div className="rounded-[20px] bg-red-50 p-3">
            <p className="text-xs text-red-500">Interés total</p>
            <p className="font-semibold text-red-600">{formatMoney(resultado.interesTotal, moneda)}</p>
          </div>
          <div className="rounded-[20px] bg-mist p-3">
            <p className="text-xs text-zinc-500">Cuotas</p>
            <p className="font-semibold text-ink">{debt.cuotas}</p>
          </div>
        </div>
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
                  <td className="py-2 text-right">{formatMoney(a.cuota, moneda)}</td>
                  <td className="py-2 text-right">{formatMoney(a.capital, moneda)}</td>
                  <td className="py-2 text-right">{formatMoney(a.interes, moneda)}</td>
                  <td className="py-2 text-right">{formatMoney(a.saldo, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <Sheet title="Editar deuda" onClose={() => setEditing(false)}>
          <DebtEditForm debt={debt} onSaved={() => { setEditing(false); reload() }} />
        </Sheet>
      )}
    </>
  )
}

function DebtEditForm({ debt, onSaved }: { debt: Debt; onSaved: () => void }) {
  const [nombre, setNombre] = useState(debt.nombre)
  const [montoTotal, setMontoTotal] = useState(String(debt.monto_total))
  const [tasa, setTasa] = useState(String(debt.tasa_interes))
  const [cuotas, setCuotas] = useState(String(debt.cuotas))
  const [cuotaMensual, setCuotaMensual] = useState(String(debt.cuota_mensual))
  const [fechaInicio, setFechaInicio] = useState(debt.fecha_inicio)
  const [saldoPendiente, setSaldoPendiente] = useState(String(debt.saldo_pendiente))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const m = parseMoney(montoTotal)
    const c = Number(cuotas)
    const cm = parseMoney(cuotaMensual)
    const sp = parseMoney(saldoPendiente)
    if (!(m > 0)) return setError('El monto debe ser mayor que cero.')
    if (!(c > 0)) return setError('Las cuotas deben ser mayor que cero.')
    setSaving(true)
    try {
      await saveDebt(
        {
          nombre: nombre.trim(),
          monto_total: m,
          tasa_interes: Number(tasa.replace(',', '.')),
          cuotas: c,
          cuota_mensual: cm,
          fecha_inicio: fechaInicio,
          saldo_pendiente: sp,
          plan_item_id: debt.plan_item_id,
        },
        debt.id,
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
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
      <Field label="Cuota mensual">
        <MoneyInput value={cuotaMensual} onChange={setCuotaMensual} className={inputCls} required />
      </Field>
      <Field label="Saldo pendiente">
        <MoneyInput value={saldoPendiente} onChange={setSaldoPendiente} className={inputCls} required />
      </Field>
      <Field label="Fecha de inicio">
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} required />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
