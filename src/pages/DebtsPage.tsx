import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { getProfile, listDebts, saveDebt } from '../lib/db'
import { formatMoney } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'
import { simularPrestamo } from '../lib/simulator'

export function DebtsPage() {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'new' | null>(null)

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
              <button key={d.id} type="button" onClick={() => navigate(`/deudas/${d.id}`)} className="w-full text-left transition active:scale-[0.99]">
                <Card className="p-5 cursor-pointer transition hover:shadow-md">
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
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {sheet && (
        <Sheet title="Nueva deuda" onClose={() => setSheet(null)}>
          <DebtForm onSaved={() => { setSheet(null); reload() }} />
        </Sheet>
      )}
    </>
  )
}

function DebtForm({ onSaved }: { onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [tasa, setTasa] = useState('0')
  const [cuotas, setCuotas] = useState('12')
  const [cuotaMensual, setCuotaMensual] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          saldo_pendiente: m,
          plan_item_id: null,
          abonos: [],
        },
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
    </form>
  )
}
