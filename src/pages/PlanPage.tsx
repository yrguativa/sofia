import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import {
  Card,
  Empty,
  ErrorText,
  Field,
  Loading,
  PageHeader,
  dangerBtn,
  inputCls,
  primaryBtn,
} from '../components/ui'
import { deletePlanItem, listCategories, listPlanItems, savePlanItem } from '../lib/db'
import { useLoad } from '../lib/useLoad'
import { grupos, type MontoTipo, type PlanItem } from '../lib/types'

export function PlanPage() {
  const [editing, setEditing] = useState<PlanItem | 'new' | null>(null)

  const loader = useCallback(async () => {
    const [items, categories] = await Promise.all([listPlanItems(), listCategories()])
    return { items, categories }
  }, [])

  const { data, error, reload } = useLoad(loader)

  function close() {
    setEditing(null)
    reload()
  }

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  return (
    <>
      <PageHeader
        title="Plantilla"
        action={
          <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
            + Nuevo
          </button>
        }
      />

      <p className="mb-6 text-sm text-slate-500">
        Son los ítems que se generan cada mes. Los cambios aplican a los meses que generes después. Para
        ajustar un mes específico, hazlo desde Presupuesto.
      </p>

      {data.items.length === 0 ? (
        <Empty>Agrega tus gastos fijos, deudas, ahorros y diezmos.</Empty>
      ) : (
        grupos.map((g) => {
          const items = data.items.filter((i) => i.grupo === g)
          if (items.length === 0) return null
          return (
            <section key={g} className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</h2>
              <Card className="flex flex-col divide-y divide-slate-100 p-0">
                {items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setEditing(i)}
                    className="flex items-center justify-between px-5 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className={`block truncate font-medium ${i.activo ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {i.nombre}
                      </span>
                      <span className="text-xs text-slate-500">
                        {i.tipo_monto === 'porcentaje' ? `${i.valor}% del salario` : 'Valor fijo'}
                        {i.activo ? '' : ' · inactivo'}
                      </span>
                    </span>
                    <span className="ml-3 text-slate-400">›</span>
                  </button>
                ))}
              </Card>
            </section>
          )
        })
      )}

      {editing && (
        <Sheet title={editing === 'new' ? 'Nuevo ítem' : 'Editar ítem'} onClose={() => setEditing(null)}>
          <PlanItemForm
            item={editing === 'new' ? null : editing}
            categories={data.categories.filter((c) => c.tipo === 'gasto')}
            onSaved={close}
          />
        </Sheet>
      )}
    </>
  )
}

function PlanItemForm({
  item,
  categories,
  onSaved,
}: {
  item: PlanItem | null
  categories: { id: string; nombre: string; icono: string | null }[]
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [grupo, setGrupo] = useState(item?.grupo ?? 'Gastos fijos')
  const [categoriaId, setCategoriaId] = useState(item?.categoria_id ?? '')
  const [tipo, setTipo] = useState<MontoTipo>(item?.tipo_monto ?? 'valor')
  const [valor, setValor] = useState(item ? String(item.valor) : '')
  const [activo, setActivo] = useState(item?.activo ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const numero = Number(valor.replace(',', '.'))
    if (!(numero >= 0)) return setError('El valor debe ser un número positivo.')
    if (tipo === 'porcentaje' && numero > 100) return setError('El porcentaje no puede superar 100.')

    setSaving(true)
    try {
      await savePlanItem(
        {
          nombre: nombre.trim(),
          grupo,
          categoria_id: categoriaId || null,
          tipo_monto: tipo,
          valor: numero,
          activo,
          orden: item?.orden ?? 0,
        },
        item?.id,
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!item) return
    if (!window.confirm(`¿Eliminar "${item.nombre}" de la plantilla? Los meses ya generados no cambian.`)) return
    setSaving(true)
    try {
      await deletePlanItem(item.id)
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

      <Field label="Grupo">
        <select value={grupo} onChange={(e) => setGrupo(e.target.value as PlanItem['grupo'])} className={inputCls}>
          {grupos.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Categoría">
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icono ? `${c.icono} ` : ''}
              {c.nombre}
            </option>
          ))}
        </select>
      </Field>

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

      <Field
        label={tipo === 'porcentaje' ? 'Porcentaje del salario (%)' : 'Valor (COP)'}
        hint={tipo === 'porcentaje' ? 'Ejemplo: 10 para el diezmo.' : undefined}
      >
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} required />
      </Field>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5" />
        Activo (se incluye al generar meses)
      </label>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {item && (
        <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
          Eliminar de la plantilla
        </button>
      )}
    </form>
  )
}
