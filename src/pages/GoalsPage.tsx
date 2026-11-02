import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, ProgressBar, dangerBtn, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { deleteGoal, getProfile, listGoals, saveGoal } from '../lib/db'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { formatMoney } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import type { Goal } from '../lib/types'

type ActiveSheet =
  | { kind: 'form'; goal: Goal | null }
  | { kind: 'aportar'; goal: Goal }
  | null

export function GoalsPage() {
  const [sheet, setSheet] = useState<ActiveSheet>(null)

  const loader = useCallback(async () => {
    const [profile, goals] = await Promise.all([getProfile(), listGoals()])
    return { profile, goals }
  }, [])

  const { data, error, reload } = useLoad(loader)

  function close() {
    setSheet(null)
    reload()
  }

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const moneda = data.profile.moneda

  return (
    <>
      <PageHeader
        title="Metas"
        action={
          <button type="button" onClick={() => setSheet({ kind: 'form', goal: null })} className={primaryBtn}>
            + Nueva
          </button>
        }
      />

      {data.goals.length === 0 ? (
        <Empty>Define una meta de ahorro, por ejemplo un viaje o un fondo de emergencia.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => {
            const pct = g.objetivo > 0 ? (g.ahorrado / g.objetivo) * 100 : 0
            const completa = g.ahorrado >= g.objetivo
            return (
              <Card key={g.id} className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                      <Icon className="h-5 w-5">{icons.metas}</Icon>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{g.nombre}</p>
                      {g.fecha_meta && <p className="text-xs text-zinc-500">Meta: {g.fecha_meta}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-acid px-3 py-1 text-xs font-semibold text-ink">
                    {Math.min(100, Math.round(pct))}%
                  </span>
                </div>
                <ProgressBar value={pct} tone={completa ? 'acid' : 'ink'} />
                <p className="mt-2 text-xs text-zinc-500">
                  {formatMoney(g.ahorrado, moneda)} de {formatMoney(g.objetivo, moneda)}
                  {completa ? ' · ¡Meta alcanzada!' : ''}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setSheet({ kind: 'aportar', goal: g })} className={`${secondaryBtn} flex-1 py-2.5 text-sm`}>
                    Aportar / retirar
                  </button>
                  <button type="button" onClick={() => setSheet({ kind: 'form', goal: g })} className={`${secondaryBtn} py-2.5 text-sm`}>
                    Editar
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {sheet?.kind === 'form' && (
        <Sheet title={sheet.goal ? 'Editar meta' : 'Nueva meta'} onClose={() => setSheet(null)}>
          <GoalForm goal={sheet.goal} onSaved={close} />
        </Sheet>
      )}

      {sheet?.kind === 'aportar' && (
        <Sheet title={sheet.goal.nombre} onClose={() => setSheet(null)}>
          <AportarForm goal={sheet.goal} moneda={moneda} onSaved={close} />
        </Sheet>
      )}
    </>
  )
}

function GoalForm({ goal, onSaved }: { goal: Goal | null; onSaved: () => void }) {
  const [nombre, setNombre] = useState(goal?.nombre ?? '')
  const [objetivo, setObjetivo] = useState(goal ? String(goal.objetivo) : '')
  const [fechaMeta, setFechaMeta] = useState(goal?.fecha_meta ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const obj = parseMoney(objetivo)
    if (!(obj > 0)) return setError('El objetivo debe ser mayor que cero.')
    setSaving(true)
    try {
      await saveGoal(
        {
          nombre: nombre.trim(),
          objetivo: obj,
          ahorrado: goal?.ahorrado ?? 0,
          fecha_meta: fechaMeta || null,
        },
        goal?.id,
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!goal) return
    if (!window.confirm(`¿Eliminar la meta "${goal.nombre}"?`)) return
    setSaving(true)
    try {
      await deleteGoal(goal.id)
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
      <Field label="Objetivo">
        <MoneyInput value={objetivo} onChange={setObjetivo} className={inputCls} required />
      </Field>
      <Field label="Fecha meta (opcional)">
        <input type="date" value={fechaMeta} onChange={(e) => setFechaMeta(e.target.value)} className={inputCls} />
      </Field>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {goal && (
        <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
          Eliminar meta
        </button>
      )}
    </form>
  )
}

function AportarForm({ goal, moneda, onSaved }: { goal: Goal; moneda: string; onSaved: () => void }) {
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function aplicar(signo: 1 | -1) {
    setError(null)
    const valor = parseMoney(monto)
    if (!(valor > 0)) return setError('Escribe un monto mayor que cero.')
    const nuevo = goal.ahorrado + signo * valor
    if (nuevo < 0) return setError('No puedes retirar más de lo ahorrado.')
    setSaving(true)
    try {
      await saveGoal({ nombre: goal.nombre, objetivo: goal.objetivo, ahorrado: nuevo, fecha_meta: goal.fecha_meta }, goal.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        Ahorrado: <span className="font-semibold text-ink">{formatMoney(goal.ahorrado, moneda)}</span>
      </p>
      <Field label="Monto">
        <MoneyInput value={monto} onChange={setMonto} className={`${inputCls} text-2xl font-semibold`} />
      </Field>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={saving} onClick={() => aplicar(-1)} className={secondaryBtn}>
          Retirar
        </button>
        <button type="button" disabled={saving} onClick={() => aplicar(1)} className={primaryBtn}>
          Aportar
        </button>
      </div>
    </div>
  )
}
