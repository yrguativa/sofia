import { useCallback, useState } from 'react'
import { Card, Empty, ErrorText, Loading, PageHeader, ProgressBar, inputCls, secondaryBtn } from '../components/ui'
import { deleteBudget, getProfile, listBudgets, listCategories, listTransactions, upsertBudget } from '../lib/db'
import { spentByCategory } from '../lib/finance'
import { currentMonth, formatMoney, monthLabel, monthRange, shiftMonth } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import type { Budget, Category } from '../lib/types'

export function BudgetsPage() {
  const [mes, setMes] = useState(currentMonth())

  const loader = useCallback(async () => {
    const [profile, categories, budgets, transactions] = await Promise.all([
      getProfile(),
      listCategories(),
      listBudgets(mes),
      listTransactions(monthRange(mes)),
    ])
    return { profile, categories, budgets, transactions }
  }, [mes])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const gastoCats = data.categories.filter((c) => c.tipo === 'gasto')
  const spent = spentByCategory(data.transactions)
  const budgetByCat = new Map(data.budgets.map((b) => [b.category_id, b]))

  const totalLimite = data.budgets.reduce((s, b) => s + b.limite, 0)
  const totalGastado = gastoCats.reduce((s, c) => s + (spent[c.id] ?? 0), 0)

  return (
    <>
      <PageHeader title="Presupuestos" />

      <div className="mb-6 flex items-center justify-between rounded-xl bg-white px-2 py-2 shadow-sm">
        <button type="button" onClick={() => setMes(shiftMonth(mes, -1))} className={`${secondaryBtn} px-3`}>
          ‹
        </button>
        <span className="font-semibold text-slate-900">{monthLabel(mes)}</span>
        <button
          type="button"
          onClick={() => setMes(shiftMonth(mes, 1))}
          disabled={mes >= currentMonth()}
          className={`${secondaryBtn} px-3`}
        >
          ›
        </button>
      </div>

      <Card className="mb-6">
        <p className="text-sm text-slate-500">Gastado de los límites definidos</p>
        <p className="mt-1 text-xl font-bold text-slate-900">
          {formatMoney(totalGastado, data.profile.moneda)}{' '}
          <span className="text-sm font-normal text-slate-500">
            / {formatMoney(totalLimite, data.profile.moneda)}
          </span>
        </p>
      </Card>

      {gastoCats.length === 0 ? (
        <Empty>No hay categorías de gasto.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {gastoCats.map((c) => (
            <BudgetRow
              key={`${c.id}-${budgetByCat.get(c.id)?.limite ?? ''}-${mes}`}
              category={c}
              budget={budgetByCat.get(c.id) ?? null}
              spent={spent[c.id] ?? 0}
              mes={mes}
              moneda={data.profile.moneda}
              onSaved={reload}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BudgetRow({
  category,
  budget,
  spent,
  mes,
  moneda,
  onSaved,
}: {
  category: Category
  budget: Budget | null
  spent: number
  mes: string
  moneda: string
  onSaved: () => void
}) {
  const [valor, setValor] = useState(budget ? String(budget.limite) : '')
  const [error, setError] = useState<string | null>(null)

  const limite = budget?.limite ?? 0
  const porcentaje = limite > 0 ? (spent / limite) * 100 : 0
  const excedido = limite > 0 && spent > limite

  async function commit() {
    const actual = budget ? String(budget.limite) : ''
    if (valor.trim() === actual) return
    setError(null)
    try {
      if (valor.trim() === '') {
        if (budget) await deleteBudget(budget.id)
      } else {
        const n = Number(valor.replace(',', '.'))
        if (!(n >= 0)) throw new Error('El límite debe ser un número positivo.')
        await upsertBudget(category.id, mes, n)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-medium text-slate-900">
          {category.icono ? `${category.icono} ` : ''}
          {category.nombre}
        </p>
        <input
          inputMode="decimal"
          placeholder="Sin límite"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className={`${inputCls} w-36 py-2 text-right text-sm`}
          aria-label={`Límite de ${category.nombre}`}
        />
      </div>
      {limite > 0 && (
        <>
          <ProgressBar value={porcentaje} tone={excedido ? 'red' : 'slate'} />
          <p className={`mt-2 text-xs ${excedido ? 'text-red-600' : 'text-slate-500'}`}>
            {formatMoney(spent, moneda)} de {formatMoney(limite, moneda)}
            {excedido ? ' · límite superado' : ''}
          </p>
        </>
      )}
      {limite === 0 && spent > 0 && (
        <p className="text-xs text-slate-500">Gastado: {formatMoney(spent, moneda)}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  )
}
