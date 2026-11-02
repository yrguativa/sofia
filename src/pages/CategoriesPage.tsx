import { useCallback, useState, type FormEvent } from 'react'
import { Card, Empty, ErrorText, Loading, PageHeader, SectionTitle, inputCls, primaryBtn } from '../components/ui'
import { createCategory, deleteCategory, listCategories } from '../lib/db'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { useLoad } from '../lib/useLoad'
import type { Category, CategoryType } from '../lib/types'

export function CategoriesPage() {
  const loader = useCallback(() => listCategories(), [])
  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const propias = data.filter((c) => c.user_id !== null)
  const predefinidas = data.filter((c) => c.user_id === null)

  return (
    <>
      <PageHeader title="Categorías" />

      <NewCategoryForm onSaved={reload} />

      <div className="mt-8">
        <SectionTitle title="Mis categorías" />
        {propias.length === 0 ? (
          <Empty>Aún no has creado categorías propias.</Empty>
        ) : (
          <CategoryList items={propias} onChanged={reload} removable />
        )}
      </div>

      <div className="mt-8">
        <SectionTitle title="Predefinidas" />
        <CategoryList items={predefinidas} onChanged={reload} />
      </div>
    </>
  )
}

function CategoryList({ items, onChanged, removable = false }: { items: Category[]; onChanged: () => void; removable?: boolean }) {
  return (
    <Card className="flex flex-col divide-y divide-mist p-0">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 text-ink">
            <Icon className="h-4 w-4 text-zinc-400">{icons.categorias}</Icon>
            {c.icono ? `${c.icono} ` : ''}
            {c.nombre}
            <span className="ml-2 text-xs text-zinc-500">{c.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>
          </span>
          {removable && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`¿Eliminar "${c.nombre}"? Los movimientos quedarán sin categoría.`)) return
                await deleteCategory(c.id)
                onChanged()
              }}
              className="text-sm font-medium text-red-600"
            >
              Eliminar
            </button>
          )}
        </div>
      ))}
    </Card>
  )
}

function NewCategoryForm({ onSaved }: { onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<CategoryType>('gasto')
  const [icono, setIcono] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createCategory(nombre.trim(), tipo, icono.trim() || null)
      setNombre('')
      setIcono('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la categoría"
            maxLength={40}
            className={inputCls}
            required
          />
          <input
            value={icono}
            onChange={(e) => setIcono(e.target.value)}
            placeholder="🙂"
            maxLength={4}
            className={`${inputCls} w-16 text-center`}
            aria-label="Icono"
          />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as CategoryType)} className={inputCls}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </select>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Creando…' : 'Agregar categoría'}
        </button>
      </form>
    </Card>
  )
}
