import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import {
  Card,
  Empty,
  ErrorText,
  Field,
  Loading,
  MonthSwitcher,
  PageHeader,
  dangerBtn,
  inputCls,
  primaryBtn,
  secondaryBtn,
} from '../components/ui'
import {
  deleteEntry,
  generarMes,
  getProfile,
  getSalario,
  listAccounts,
  listEntries,
  saveSalario,
  setEntryStatus,
  updateEntry,
} from '../lib/db'
import { montoDesde, resumenPresupuesto } from '../lib/presupuesto'
import { currentMonth, formatMoney, monthLabel, shiftMonth } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { grupos, type BudgetEntry, type MontoTipo } from '../lib/types'

export function BudgetsPage() {
  const [mes, setMes] = useState(currentMonth())
  const [editing, setEditing] = useState<BudgetEntry | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loader = useCallback(async () => {
    const [profile, accounts, salario, entries] = await Promise.all([
      getProfile(),
      listAccounts(),
      getSalario(mes),
      listEntries(mes),
    ])
    return { profile, accounts, salario, entries }
  }, [mes])

  const { data, error, reload } = useLoad(loader)

  async function run(fn: () => Promise<unknown>) {
    setActionError(null)
    setAviso(null)
    try {
      await fn()
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    }
  }

  async function generar() {
    setActionError(null)
    setAviso(null)
    try {
      const creados = await generarMes(mes)
      setAviso(
        creados > 0
          ? `Se agregaron ${creados} ítems de la plantilla.`
          : 'Este mes ya tiene todos los ítems de la plantilla.',
      )
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo generar el mes.')
    }
  }

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const moneda = data.profile.moneda
  const salario = data.salario ?? 0
  const resumen = resumenPresupuesto(salario, data.entries)

  return (
    <>
      <PageHeader
        title="Presupuesto"
        action={
          <Link to="/plantilla" className={`${secondaryBtn} py-2 text-sm`}>
            Plantilla
          </Link>
        }
      />

      <MonthSwitcher
        label={monthLabel(mes)}
        onPrev={() => setMes(shiftMonth(mes, -1))}
        onNext={() => setMes(shiftMonth(mes, 1))}
        canNext={mes < currentMonth()}
      />

      <SalarioCard
        key={`${mes}-${salario}`}
        salario={salario}
        onSave={(valor) => run(() => saveSalario(mes, valor))}
      />

      <div className="mb-6 flex flex-col gap-2">
        <button type="button" onClick={generar} className={primaryBtn}>
          Generar desde plantilla
        </button>
        {aviso && (
          <p className="text-sm text-emerald-700" role="status">
            {aviso}
          </p>
        )}
        {actionError && <ErrorText>{actionError}</ErrorText>}
      </div>

      {data.entries.length > 0 && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Resumen label="Planificado" value={formatMoney(resumen.planificado, moneda)} />
            <Resumen label="Pagado" value={formatMoney(resumen.pagado, moneda)} />
            <Resumen label="Pendiente" value={formatMoney(resumen.pendiente, moneda)} />
            <Resumen
              label="Sin asignar"
              value={formatMoney(resumen.sinAsignar, moneda)}
              tone={resumen.sinAsignar < 0 ? 'red' : 'normal'}
            />
          </div>
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            {grupos.map((g) => {
              const r = resumen.porGrupo[g]
              if (!r) return null
              return (
                <div key={g} className="flex justify-between py-2">
                  <span className="text-slate-600">{g}</span>
                  <span className="text-slate-900">
                    {formatMoney(r.pagado, moneda)} / {formatMoney(r.planificado, moneda)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {data.entries.length === 0 ? (
        <Empty>
          Este mes aún no tiene ítems. Crea tu plantilla y pulsa <strong>Generar desde plantilla</strong>.
        </Empty>
      ) : (
        grupos.map((g) => {
          const items = data.entries.filter((e) => e.grupo === g)
          if (items.length === 0) return null
          return (
            <section key={g} className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    accounts={data.accounts}
                    moneda={moneda}
                    onStatus={(cuentaId) => run(() => setEntryStatus(e.id, cuentaId))}
                    onEdit={() => setEditing(e)}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {editing && (
        <Sheet title={editing.nombre} onClose={() => setEditing(null)}>
          <EntryForm
            entry={editing}
            salario={salario}
            moneda={moneda}
            onSaved={() => {
              setEditing(null)
              reload()
            }}
          />
        </Sheet>
      )}
    </>
  )
}

function Resumen({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'red' }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold ${tone === 'red' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function SalarioCard({ salario, onSave }: { salario: number; onSave: (valor: number) => void }) {
  const [valor, setValor] = useState(String(salario))
  const [error, setError] = useState<string | null>(null)

  function commit() {
    if (valor.trim() === String(salario)) return
    const n = Number(valor.replace(',', '.'))
    if (!(n >= 0)) {
      setError('El salario debe ser un número positivo.')
      return
    }
    setError(null)
    onSave(n)
  }

  return (
    <Card className="mb-4 p-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Salario del mes
        <input
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className={`${inputCls} text-xl font-semibold`}
        />
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Los ítems en porcentaje se recalculan al cambiar este valor (solo los pendientes).
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  )
}

function EntryRow({
  entry,
  accounts,
  moneda,
  onStatus,
  onEdit,
}: {
  entry: BudgetEntry
  accounts: { id: string; nombre: string }[]
  moneda: string
  onStatus: (cuentaId: string | null) => void
  onEdit: () => void
}) {
  const pagado = entry.transaction_id !== null
  const detalle = entry.tipo_monto === 'porcentaje' ? `${entry.valor}% del salario` : 'Valor fijo'

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={pagado}
          className="min-w-0 flex-1 text-left disabled:cursor-default"
        >
          <p className="truncate font-medium text-slate-900">{entry.nombre}</p>
          <p className="text-xs text-slate-500">
            {detalle}
            {pagado ? ' · pagado' : ''}
          </p>
        </button>
        <p className="whitespace-nowrap font-semibold text-slate-900">{formatMoney(entry.monto, moneda)}</p>
      </div>
      <select
        value={entry.cuenta_id ?? ''}
        onChange={(e) => onStatus(e.target.value || null)}
        className={`${inputCls} mt-3 py-2 text-sm`}
        aria-label={`Estado de ${entry.nombre}`}
      >
        <option value="">Pendiente</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            Pagado desde {a.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}

function EntryForm({
  entry,
  salario,
  moneda,
  onSaved,
}: {
  entry: BudgetEntry
  salario: number
  moneda: string
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<MontoTipo>(entry.tipo_monto)
  const [valor, setValor] = useState(String(entry.valor))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numero = Number(valor.replace(',', '.'))
  const monto = numero >= 0 ? montoDesde(tipo, numero, salario) : 0

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!(numero >= 0)) return setError('El valor debe ser un número positivo.')
    setSaving(true)
    setError(null)
    try {
      await updateEntry(entry.id, { tipo_monto: tipo, valor: numero, monto })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Quitar "${entry.nombre}" de este mes?`)) return
    setSaving(true)
    try {
      await deleteEntry(entry.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(['valor', 'porcentaje'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-lg py-2 text-sm font-medium ${tipo === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            {t === 'valor' ? 'Valor fijo' : 'Porcentaje'}
          </button>
        ))}
      </div>

      <Field label={tipo === 'porcentaje' ? 'Porcentaje del salario (%)' : 'Valor'}>
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={`${inputCls} text-xl font-semibold`} />
      </Field>

      <p className="text-sm text-slate-600">
        Monto de este mes: <span className="font-semibold text-slate-900">{formatMoney(monto, moneda)}</span>
      </p>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
        Quitar de este mes
      </button>
    </form>
  )
}
