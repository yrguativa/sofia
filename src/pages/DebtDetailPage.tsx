import { useCallback, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { deleteDebt, getProfile, listAccounts, listDebts, saveDebt, saveTransaction, updateDebtSaldo } from '../lib/db'
import { formatMoney } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'
import type { Debt } from '../lib/types'
import { amortizarConAbonos, calcularAhorroInteres, type TipoAbono } from '../lib/abonos'
import { Sheet } from '../components/Sheet'

function mesDeuda(fechaInicio: string, mes: number): string {
  const [y, m] = fechaInicio.split('-').map(Number)
  const d = new Date(y, m - 1 + (mes - 1), 1)
  const label = d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
  return `${mes}: ${label.charAt(0).toUpperCase() + label.slice(1)}`
}

export function DebtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [abono, setAbono] = useState('')
  const [mostrarAbono, setMostrarAbono] = useState(false)
  const [abonoModal, setAbonoModal] = useState<number | null>(null)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoTipo, setAbonoTipo] = useState<TipoAbono>('plazo')
  const [cuotaModal, setCuotaModal] = useState<number | null>(null)
  const [cuotaCuentaId, setCuotaCuentaId] = useState<string>('')
  const [savingAbono, setSavingAbono] = useState(false)

  const loader = useCallback(async () => {
    const [profile, debts, accounts] = await Promise.all([getProfile(), listDebts(), listAccounts()])
    const debt = debts.find((d) => d.id === id)
    if (!debt) throw new Error('Deuda no encontrada')
    return { profile, debt, accounts }
  }, [id])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const { profile, debt, accounts } = data
  const abonos = debt.abonos ?? []
  const moneda = profile.moneda
  const pct = debt.monto_total > 0 ? ((debt.monto_total - debt.saldo_pendiente) / debt.monto_total) * 100 : 0
  const paidCuotas = Math.min(debt.cuotas, Math.max(0, Math.round((debt.monto_total - debt.saldo_pendiente) / (debt.cuota_mensual || 1))))
  const resultado = amortizarConAbonos(debt.monto_total, debt.tasa_interes, debt.cuotas, abonos)
  const ahorroInteres = abonos.length > 0 ? calcularAhorroInteres(debt.monto_total, debt.tasa_interes, debt.cuotas, abonos) : 0

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${debt.nombre}"?`)) return
    await deleteDebt(debt.id)
    navigate('/deudas')
  }

  async function guardarAbono() {
    const monto = parseMoney(abonoMonto)
    if (!(monto > 0) || abonoModal === null) return
    setSavingAbono(true)
    try {
      const nuevosAbonos = abonos.filter((a) => a.mes !== abonoModal)
      nuevosAbonos.push({ mes: abonoModal, monto, tipo: abonoTipo })
      await saveDebt(
        {
          nombre: debt.nombre,
          monto_total: debt.monto_total,
          tasa_interes: debt.tasa_interes,
          cuotas: debt.cuotas,
          cuota_mensual: debt.cuota_mensual,
          fecha_inicio: debt.fecha_inicio,
          saldo_pendiente: Math.max(0, debt.saldo_pendiente - monto),
          plan_item_id: debt.plan_item_id,
          abonos: nuevosAbonos,
        },
        debt.id,
      )
      setAbonoModal(null)
      setAbonoMonto('')
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo guardar el abono.')
    } finally {
      setSavingAbono(false)
    }
  }

  async function eliminarAbono(mes: number) {
    const abono = abonos.find((a) => a.mes === mes)
    const monto = abono?.monto ?? 0
    const nuevosAbonos = abonos.filter((a) => a.mes !== mes)
    try {
      await saveDebt(
        {
          nombre: debt.nombre,
          monto_total: debt.monto_total,
          tasa_interes: debt.tasa_interes,
          cuotas: debt.cuotas,
          cuota_mensual: debt.cuota_mensual,
          fecha_inicio: debt.fecha_inicio,
          saldo_pendiente: debt.saldo_pendiente + monto,
          plan_item_id: debt.plan_item_id,
          abonos: nuevosAbonos,
        },
        debt.id,
      )
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar el abono.')
    }
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
          <p className="text-xs text-zinc-500">{Math.round(pct)}% pagado · {paidCuotas} de {debt.cuotas} cuotas</p>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn} flex-1 gap-2`}>
              <Icon className="h-4 w-4">{icons.editar}</Icon>
              Editar
            </button>
            <button type="button" onClick={handleDelete} className={`${secondaryBtn} flex-1 gap-2 text-red-600`}>
              <Icon className="h-4 w-4">{icons.eliminar}</Icon>
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

          {mostrarAbono && parseMoney(abono) > 0 && (
            <div className="mt-4 rounded-[24px] bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">
                Con abono de {formatMoney(parseMoney(abono), moneda)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Nueva cuota</p>
                  <p className="font-semibold text-ink">{formatMoney(amortizarConAbonos(debt.monto_total, debt.tasa_interes, debt.cuotas, [{ mes: 1, monto: parseMoney(abono), tipo: 'cuota' }]).cuota, moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Nuevo total</p>
                  <p className="font-semibold text-ink">{formatMoney(amortizarConAbonos(debt.monto_total, debt.tasa_interes, debt.cuotas, [{ mes: 1, monto: parseMoney(abono), tipo: 'cuota' }]).totalPagar, moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Ahorro en interés</p>
                  <p className="font-semibold text-emerald-600">{formatMoney(calcularAhorroInteres(debt.monto_total, debt.tasa_interes, debt.cuotas, [{ mes: 1, monto: parseMoney(abono), tipo: 'cuota' }]), moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Nuevas cuotas</p>
                  <p className="font-semibold text-ink">{amortizarConAbonos(debt.monto_total, debt.tasa_interes, debt.cuotas, [{ mes: 1, monto: parseMoney(abono), tipo: 'cuota' }]).meses}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Plan de pagos</h2>
        {abonos.length > 0 && (
          <div className="mb-4 rounded-[20px] bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">
              Ahorro en interés con abonos: {formatMoney(ahorroInteres, moneda)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {abonos.length} abono{abonos.length > 1 ? 's' : ''} aplicado{abonos.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
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
            <p className="font-semibold text-ink">{resultado.meses}</p>
          </div>
        </div>
        {paidCuotas === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Aún no hay cuotas pagadas.</p>
        ) : (
        <>
        <div className="hidden max-h-96 overflow-x-auto overflow-y-auto md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="pb-2 text-left">Mes</th>
                <th className="pb-2 text-right">Cuota</th>
                <th className="pb-2 text-right">Capital</th>
                <th className="pb-2 text-right">Interés</th>
                <th className="pb-2 text-right">Abono</th>
                <th className="pb-2 text-right">Saldo</th>
                <th className="pb-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {resultado.amortizacion.filter((a) => a.mes <= paidCuotas).map((a) => {
                const abonoAplicado = abonos.find((ab) => ab.mes === a.mes)
                return (
                  <tr key={a.mes} className={`border-b border-zinc-100 ${a.mes <= paidCuotas ? 'bg-emerald-50/60' : abonoAplicado ? 'bg-emerald-50' : ''}`}>
                    <td className="py-2">{a.mes}: {mesDeuda(debt.fecha_inicio, a.mes)}</td>
                    <td className="py-2 text-right">{formatMoney(a.cuota, moneda)}</td>
                    <td className="py-2 text-right">{formatMoney(a.capital - a.abono, moneda)}</td>
                    <td className="py-2 text-right">{formatMoney(a.interes, moneda)}</td>
                    <td className="py-2 text-right">{a.abono > 0 ? formatMoney(a.abono, moneda) : '-'}</td>
                    <td className="py-2 text-right">{formatMoney(a.saldo, moneda)}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {abonoAplicado ? (
                          <button
                            type="button"
                            onClick={() => eliminarAbono(a.mes)}
                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition active:scale-95"
                          >
                            Quitar
                          </button>
                        ) : a.mes <= paidCuotas ? (
                          <span className="text-xs text-emerald-600">Pagada</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { setCuotaModal(a.mes); setCuotaCuentaId(accounts[0]?.id ?? '') }}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition active:scale-95"
                            >
                              Pagar
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAbonoModal(a.mes); setAbonoMonto(''); setAbonoTipo('plazo') }}
                              className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-acid transition active:scale-95"
                            >
                              Abono
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto md:hidden">
          {resultado.amortizacion.filter((a) => a.mes <= paidCuotas).map((a) => {
            const abonoAplicado = abonos.find((ab) => ab.mes === a.mes)
            return (
              <div key={a.mes} className={`rounded-[18px] p-4 shadow-sm ${a.mes <= paidCuotas ? 'bg-emerald-50/60' : abonoAplicado ? 'bg-emerald-50' : 'bg-mist'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-ink">{a.mes}: {mesDeuda(debt.fecha_inicio, a.mes)}</p>
                  {abonoAplicado ? (
                    <button
                      type="button"
                      onClick={() => eliminarAbono(a.mes)}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition active:scale-95"
                    >
                      Quitar
                    </button>
                  ) : a.mes <= paidCuotas ? (
                    <span className="text-xs text-emerald-600">Pagada</span>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setCuotaModal(a.mes); setCuotaCuentaId(accounts[0]?.id ?? '') }}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition active:scale-95"
                      >
                        Pagar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAbonoModal(a.mes); setAbonoMonto(''); setAbonoTipo('plazo') }}
                        className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-acid transition active:scale-95"
                      >
                        Abono
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Cuota</p>
                    <p className="font-medium text-ink">{formatMoney(a.cuota, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Capital</p>
                    <p className="font-medium text-ink">{formatMoney(a.capital - a.abono, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Interés</p>
                    <p className="font-medium text-ink">{formatMoney(a.interes, moneda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Abono</p>
                    <p className="font-medium text-ink">{a.abono > 0 ? formatMoney(a.abono, moneda) : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500">Saldo</p>
                    <p className="font-semibold text-ink">{formatMoney(a.saldo, moneda)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </>
        )}
      </Card>

      {cuotaModal !== null && (
        <Sheet title={`Pagar cuota ${cuotaModal}`} onClose={() => setCuotaModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] bg-mist p-5">
              <p className="text-sm text-zinc-500">Monto de la cuota</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {formatMoney(resultado.amortizacion.find((a) => a.mes === cuotaModal)?.cuota ?? debt.cuota_mensual, moneda)}
              </p>
            </div>
            <Field label="Cuenta">
              <select value={cuotaCuentaId} onChange={(e) => setCuotaCuentaId(e.target.value)} className={inputCls} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              onClick={async () => {
                const cuota = resultado.amortizacion.find((a) => a.mes === cuotaModal)?.cuota ?? debt.cuota_mensual
                if (!cuotaCuentaId) return
                try {
                  await saveTransaction({
                    account_id: cuotaCuentaId,
                    cuenta_destino_id: null,
                    category_id: null,
                    bolsillo_id: null,
                    monto: cuota,
                    tipo: 'gasto',
                    fecha: debt.fecha_inicio,
                    nota: `${debt.nombre} - cuota ${cuotaModal}`,
                  })
                  const nuevoSaldo = Math.max(0, debt.saldo_pendiente - cuota)
                  await updateDebtSaldo(debt.id, nuevoSaldo)
                  setCuotaModal(null)
                  reload()
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
                }
              }}
              className={`${primaryBtn} w-full gap-2`}
            >
              <Icon className="h-4 w-4">{icons.check}</Icon>
              Confirmar pago
            </button>
          </div>
        </Sheet>
      )}

      {abonoModal !== null && (
        <Sheet title={`Abono en cuota ${abonoModal}`} onClose={() => setAbonoModal(null)}>
          <div className="flex flex-col gap-4">
            <Field label="Monto del abono">
              <MoneyInput value={abonoMonto} onChange={setAbonoMonto} className={inputCls} required />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-600">Tipo de abono</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAbonoTipo('plazo')}
                  aria-pressed={abonoTipo === 'plazo'}
                  className={`flex flex-col items-center gap-2 rounded-[22px] p-4 text-center transition active:scale-[0.98] ${
                    abonoTipo === 'plazo' ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-zinc-200'
                  }`}
                >
                  <Icon className="h-5 w-5">{icons.calendario}</Icon>
                  <span className="text-sm font-medium">Reducir plazo</span>
                  <span className="text-xs opacity-70">Menos cuotas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbonoTipo('cuota')}
                  aria-pressed={abonoTipo === 'cuota'}
                  className={`flex flex-col items-center gap-2 rounded-[22px] p-4 text-center transition active:scale-[0.98] ${
                    abonoTipo === 'cuota' ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-zinc-200'
                  }`}
                >
                  <Icon className="h-5 w-5">{icons.salario}</Icon>
                  <span className="text-sm font-medium">Reducir cuota</span>
                  <span className="text-xs opacity-70">Menos por mes</span>
                </button>
              </div>
            </div>
            <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-zinc-600">
              {abonoTipo === 'plazo'
                ? 'El abono reduce el principal y se acortan las cuotas restantes.'
                : 'El abono reduce el principal y se recalcula la cuota mensual.'}
            </p>
            <button type="button" onClick={guardarAbono} disabled={savingAbono || !parseMoney(abonoMonto)} className={`${primaryBtn} w-full gap-2`}>
              <Icon className="h-4 w-4">{icons.check}</Icon>
              {savingAbono ? 'Guardando…' : 'Aplicar abono'}
            </button>
          </div>
        </Sheet>
      )}

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
          abonos: debt.abonos,
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
