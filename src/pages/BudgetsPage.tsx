import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { MoneyInput } from '../components/MoneyInput'
import { Icon } from '../components/icons'
import { icons, grupoIcon } from '../components/iconPaths'
import { fondosPago } from '../components/estadoPago'
import {
  Card,
  Empty,
  ErrorText,
  Field,
  Loading,
  MonthSwitcher,
  PageHeader,
  ProgressBar,
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
import { parseMoney } from '../lib/money'
import { currentMonth, formatMoney, mesDePresupuesto, monthLabel, shiftMonth } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { grupos, type Account, type BudgetEntry, type MontoTipo } from '../lib/types'

function porcentaje(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

export function BudgetsPage() {
  const perfil = useLoad(getProfile)

  if (perfil.error) return <ErrorText>{perfil.error}</ErrorText>
  if (!perfil.data) return <Loading />

  return <BudgetsContent mesInicial={mesDePresupuesto(new Date(), perfil.data.dia_pago)} />
}

function BudgetsContent({ mesInicial }: { mesInicial: string }) {
  const [mes, setMes] = useState(mesInicial)
  const [editing, setEditing] = useState<BudgetEntry | null>(null)
  const [pagando, setPagando] = useState<BudgetEntry | null>(null)
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
    if (data?.salario == null) {
      setActionError(`Configura el salario para ${mes} primero (tarjeta de arriba o Más → Salario).`)
      return
    }
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
          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="mb-2 flex items-end justify-between text-sm">
              <span className="font-medium text-ink">Ejecutado del plan</span>
              <span className="font-semibold text-ink">{porcentaje(resumen.pagado, resumen.planificado)}%</span>
            </div>
            <ProgressBar value={porcentaje(resumen.pagado, resumen.planificado)} tone="acid" />
            <p className="mt-2 text-xs text-zinc-500">
              {formatMoney(resumen.pagado, moneda)} de {formatMoney(resumen.planificado, moneda)} pagados
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-4">
            {grupos.map((g) => {
              const r = resumen.porGrupo[g]
              if (!r) return null
              const pct = porcentaje(r.pagado, r.planificado)
              return (
                <div key={g}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{g}</span>
                    <span className="text-xs text-zinc-500">
                      {formatMoney(r.pagado, moneda)} / {formatMoney(r.planificado, moneda)} · {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={pct >= 100 ? 'acid' : 'ink'} />
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
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Icon className="h-4 w-4">{grupoIcon[g]}</Icon>
                {g}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    moneda={moneda}
                    onPagar={() => setPagando(e)}
                    onEdit={() => setEditing(e)}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {pagando && (
        <Sheet title={`Pagar ${pagando.nombre}`} onClose={() => setPagando(null)}>
          <PagoForm
            entry={pagando}
            moneda={moneda}
            accounts={data.accounts}
            onConfirm={async (cuentaId) => {
              const id = pagando.id
              try {
                await setEntryStatus(id, cuentaId)
                setPagando(null)
                reload()
                return null
              } catch (err) {
                return err instanceof Error ? err.message : 'No se pudo registrar el pago.'
              }
            }}
          />
        </Sheet>
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
    const n = parseMoney(valor)
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
        <MoneyInput
          value={valor}
          onChange={setValor}
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
  moneda,
  onPagar,
  onEdit,
}: {
  entry: BudgetEntry
  moneda: string
  onPagar: () => void
  onEdit: () => void
}) {
  const pagado = entry.metodo_pago !== null
  const color = entry.metodo_pago === 'bolsillo' ? 'amarillo' : entry.metodo_pago === 'pago' ? 'verde' : undefined

  return (
    <div className={`group flex flex-col gap-2 rounded-[18px] p-3.5 shadow-sm ${fondosPago[color ?? 'neutro']}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={pagado}
          className="min-w-0 truncate text-left font-medium text-ink disabled:cursor-default"
        >
          {entry.nombre}
        </button>
        <p className="whitespace-nowrap text-sm font-semibold text-ink">{formatMoney(entry.monto, moneda)}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-600">
          <Icon className="h-3.5 w-3.5 shrink-0">
            {pagado ? (entry.metodo_pago === 'bolsillo' ? icons.efectivo : icons.banco) : icons.pendiente}
          </Icon>
          <span className="truncate">{pagado ? (entry.metodo_pago === 'bolsillo' ? 'Bolsillo' : 'Pago') : 'Pendiente'}</span>
        </span>
        {pagado ? (
          <button
            type="button"
            onClick={onPagar}
            aria-label="Cambiar pago"
            title="Cambiar pago"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <Icon className="h-4 w-4">{icons.editar}</Icon>
          </button>
        ) : (
          <button type="button" onClick={onPagar} className={`${primaryBtn} gap-1.5 px-3 py-1.5 text-xs`}>
            <Icon className="h-3.5 w-3.5">{icons.salario}</Icon>
            Pagar
          </button>
        )}
      </div>
    </div>
  )
}

function PagoForm({
  entry,
  moneda,
  accounts,
  onConfirm,
}: {
  entry: BudgetEntry
  moneda: string
  accounts: Account[]
  onConfirm: (cuentaId: string | null) => Promise<string | null>
}) {
  const [metodo, setMetodo] = useState<string | null>(entry.metodo_pago)
  const [cuentaId, setCuentaId] = useState<string | null>(entry.cuenta_id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cuentasPago = accounts.filter((a) => a.tipo !== 'efectivo')
  const cuentasBolsillo = accounts.filter((a) => a.tipo === 'efectivo')
  const cuentasDisponibles = metodo === 'bolsillo' ? cuentasBolsillo : cuentasPago
  // Si no hay del tipo, permitir todas
  const lista = cuentasDisponibles.length > 0 ? cuentasDisponibles : accounts

  // Inicializar cuenta si se selecciona un método de pago y no hay cuenta
  useEffect(() => {
    if (metodo && !cuentaId && lista.length > 0) {
      setCuentaId(lista[0].id)
    }
    if (!metodo) setCuentaId(null)
  }, [metodo, lista, cuentaId])

  const cambio =
    metodo !== entry.metodo_pago || cuentaId !== entry.cuenta_id

  async function confirmar() {
    setSaving(true)
    setError(null)
    const msg = await onConfirm(metodo ? cuentaId : null)
    if (msg) {
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[24px] bg-mist p-5">
        <p className="text-sm text-zinc-500">{entry.nombre}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{formatMoney(entry.monto, moneda)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {entry.tipo_monto === 'porcentaje' ? `${entry.valor}% del salario` : 'Valor fijo'}
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-zinc-600">Estado de pago</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setMetodo(null)}
            aria-pressed={metodo === null}
            className={`flex flex-col items-center gap-2 rounded-[22px] p-4 text-center transition active:scale-[0.98] ${
              metodo === null ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-zinc-200'
            }`}
          >
            <Icon className="h-5 w-5">{icons.pendiente}</Icon>
            <span className="text-sm font-medium">Pendiente</span>
          </button>
          <button
            type="button"
            onClick={() => setMetodo('pago')}
            aria-pressed={metodo === 'pago'}
            className={`flex flex-col items-center gap-2 rounded-[22px] p-4 text-center transition active:scale-[0.98] ${
              metodo === 'pago' ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-zinc-200'
            }`}
          >
            <Icon className="h-5 w-5">{icons.banco}</Icon>
            <span className="text-sm font-medium">Pago</span>
          </button>
          <button
            type="button"
            onClick={() => setMetodo('bolsillo')}
            aria-pressed={metodo === 'bolsillo'}
            className={`flex flex-col items-center gap-2 rounded-[22px] p-4 text-center transition active:scale-[0.98] ${
              metodo === 'bolsillo' ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-zinc-200'
            }`}
          >
            <Icon className="h-5 w-5">{icons.efectivo}</Icon>
            <span className="text-sm font-medium">Bolsillo</span>
          </button>
        </div>
      </div>

      {metodo && (
        <Field label={metodo === 'bolsillo' ? 'Cuenta de efectivo' : 'Cuenta bancaria'}>
          <select
            value={cuentaId ?? ''}
            onChange={(e) => setCuentaId(e.target.value || null)}
            className={inputCls}
            required
          >
            <option value="">Selecciona una cuenta</option>
            {lista.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Field>
      )}

      <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-zinc-600">
        {metodo === null
          ? 'El ítem volverá a pendiente y se eliminará el movimiento asociado.'
          : `Se registrará un gasto de ${formatMoney(entry.monto, moneda)} en la cuenta seleccionada y el ítem quedará pagado.`}
      </p>

      {error && <ErrorText>{error}</ErrorText>}

      <button
        type="button"
        onClick={confirmar}
        disabled={!cambio || saving || (metodo !== null && !cuentaId)}
        className={`${primaryBtn} w-full gap-2`}
      >
        <Icon className="h-4 w-4">{metodo === null ? icons.pendiente : icons.check}</Icon>
        {saving ? 'Guardando…' : 'Confirmar'}
      </button>
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

  const numero = tipo === 'valor' ? parseMoney(valor) : Number(valor.replace(',', '.'))
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
        {tipo === 'valor' ? (
          <MoneyInput value={valor} onChange={setValor} className={`${inputCls} text-xl font-semibold`} />
        ) : (
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={`${inputCls} text-xl font-semibold`} />
        )}
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
