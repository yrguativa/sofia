import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { deleteIngresoAdicional, getProfile, listIngresosAdicionales, saveIngresoAdicional } from '../lib/db'
import { formatMoney, mesDePresupuesto } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'

export function IngresosPage() {
  const [mes, setMes] = useState(mesDePresupuesto(new Date(), 1).slice(0, 7))
  const [sheet, setSheet] = useState(false)

  const loader = useCallback(async () => {
    const [profile, items] = await Promise.all([getProfile(), listIngresosAdicionales(mes)])
    return { profile, items }
  }, [mes])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const total = data.items.reduce((s, i) => s + Number(i.monto), 0)

  return (
    <>
      <PageHeader
        title="Ingresos adicionales"
        action={
          <button type="button" onClick={() => setSheet(true)} className={primaryBtn}>
            <Icon className="h-4 w-4">{icons.plus}</Icon>
            Nuevo
          </button>
        }
      />

      <p className="mb-4 text-sm text-zinc-500">
        Ingresos extra del mes (bonos, ventas, etc.) que se suman al salario en el presupuesto.
      </p>

      <div className="mb-4">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className={inputCls}
        />
      </div>

      <Card className="mb-4 p-4">
        <p className="text-xs text-zinc-500">Total ingresos adicionales</p>
        <p className="text-2xl font-bold text-ink">{formatMoney(total, data.profile.moneda)}</p>
      </Card>

      {data.items.length === 0 ? (
        <Empty>No hay ingresos adicionales para este mes.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((i) => (
            <Card key={i.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">{i.nombre}</p>
                <p className="text-xs text-zinc-500">Ingreso adicional</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-ink">{formatMoney(Number(i.monto), data.profile.moneda)}</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('¿Eliminar este ingreso?')) return
                    await deleteIngresoAdicional(i.id)
                    reload()
                  }}
                  className="text-red-600"
                >
                  <Icon className="h-4 w-4">{icons.eliminar}</Icon>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {sheet && (
        <Sheet title="Nuevo ingreso adicional" onClose={() => setSheet(false)}>
          <IngresoForm mes={mes} onSaved={() => { setSheet(false); reload() }} />
        </Sheet>
      )}
    </>
  )
}

function IngresoForm({ mes, onSaved }: { mes: string; onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const n = parseMoney(monto)
    if (!(n > 0)) return setError('El monto debe ser mayor que cero.')
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    try {
      await saveIngresoAdicional(mes, nombre, n)
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
      <Field label="Monto">
        <MoneyInput value={monto} onChange={setMonto} className={inputCls} required />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}