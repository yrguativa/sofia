import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { deleteSalarioHistorial, getProfile, listSalarioHistorial, saveSalarioHistorial } from '../lib/db'
import { formatMoney, mesDePresupuesto } from '../lib/format'
import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useLoad } from '../lib/useLoad'

export function SalarioPage() {
  const [sheet, setSheet] = useState(false)

  const loader = useCallback(async () => {
    const [profile, historial] = await Promise.all([getProfile(), listSalarioHistorial()])
    return { profile, historial }
  }, [])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />


  return (
    <>
      <PageHeader
        title="Salario"
        action={
          <button type="button" onClick={() => setSheet(true)} className={primaryBtn}>
            <Icon className="h-4 w-4">{icons.plus}</Icon>
            Nuevo
          </button>
        }
      />

      <p className="mb-6 text-sm text-zinc-500">
        El salario vigente se aplica desde el mes indicado. Los cambios recalcularán los ítems pendientes.
      </p>

      {data.historial.length === 0 ? (
        <Empty>Configura tu primer salario.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {data.historial.map((h) => (
            <Card key={h.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink">
                  <Icon className="h-5 w-5">{icons.salario}</Icon>
                </span>
                <div>
                  <p className="font-medium text-ink">{h.desde.slice(0, 7)}</p>
                  <p className="text-xs text-zinc-500">Vigente desde</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-ink">{formatMoney(Number(h.monto), data.profile.moneda)}</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('¿Eliminar este cambio?')) return
                    await deleteSalarioHistorial(h.id)
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
        <Sheet title="Nuevo salario" onClose={() => setSheet(false)}>
          <SalarioForm onSaved={() => { setSheet(false); reload() }} />
        </Sheet>
      )}
    </>
  )
}

function SalarioForm({ onSaved }: { onSaved: () => void }) {
  const [desde, setDesde] = useState(mesDePresupuesto(new Date(), 1).slice(0, 7))
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const n = parseMoney(monto)
    if (!(n > 0)) return setError('El monto debe ser mayor que cero.')
    setSaving(true)
    try {
      await saveSalarioHistorial(desde, n)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Mes de vigencia">
        <input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} required />
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
