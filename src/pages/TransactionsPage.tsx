import { useCallback, useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionRow } from '../components/TransactionRow'
import { Empty, ErrorText, Loading, MonthSwitcher, PageHeader, primaryBtn } from '../components/ui'
import { listAccounts, listBolsillos, listCategories, getProfile, listEntries, listTransactions } from '../lib/db'
import { currentMonth, dayLabel, mesDePresupuesto, monthLabel, monthRange, shiftMonth, formatMoney } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import type { Transaction, TxType } from '../lib/types'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { colorPorCuenta } from '../components/estadoPago'
import { summarize } from '../lib/finance'
import { Card } from '../components/ui'

type Filtro = 'todos' | TxType

export function TransactionsPage() {
  const perfil = useLoad(getProfile)

  if (perfil.error) return <ErrorText>{perfil.error}</ErrorText>
  if (!perfil.data) return <Loading />

  return <TransactionsContent mesInicial={mesDePresupuesto(new Date(), perfil.data.dia_pago)} moneda={perfil.data.moneda} />
}

function TransactionsContent({ mesInicial, moneda }: { mesInicial: string; moneda: string }) {
  const [mes, setMes] = useState(mesInicial)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const loader = useCallback(async () => {
    const [accounts, categories, transactions, entries, bolsillos] = await Promise.all([
      listAccounts(),
      listCategories(),
      listTransactions(monthRange(mes)),
      listEntries(mes),
      listBolsillos(),
    ])
    const pagadosPresupuesto = new Map<string, string>()
    const bolsillosPresupuesto = new Set<string>()
    for (const e of entries) {
      if (e.transaction_id && e.cuenta_id) {
        const cuenta = accounts.find((a) => a.id === e.cuenta_id)
        if (cuenta) pagadosPresupuesto.set(e.transaction_id, cuenta.nombre)
        if (e.metodo_pago === 'bolsillo') bolsillosPresupuesto.add(e.transaction_id)
      }
    }
    return { accounts, categories, transactions, pagadosPresupuesto, bolsillos, bolsillosPresupuesto }
  }, [mes])

  const { data, error, reload } = useLoad(loader)

  function close() {
    setEditing(null)
    reload()
  }

  const filtradas = useMemo(() => {
    if (!data) return []
    if (filtro === 'todos') return data.transactions
    return data.transactions.filter((t) => t.tipo === filtro)
  }, [data, filtro])

  const grupos = new Map<string, Transaction[]>()
  for (const t of filtradas) {
    grupos.set(t.fecha, [...(grupos.get(t.fecha) ?? []), t])
  }

  const resumen = useMemo(() => {
    if (!data) return { ingresos: 0, gastos: 0 }
    return summarize(data.transactions)
  }, [data])

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  return (
    <>
      <PageHeader
        title="Movimientos"
        action={
          data.accounts.length > 0 ? (
            <button type="button" onClick={() => setEditing('new')} className={`${primaryBtn} hidden lg:inline-flex gap-2`}>
              <Icon className="h-4 w-4">{icons.plus}</Icon>
              Nuevo
            </button>
          ) : null
        }
      />

      <MonthSwitcher
        label={monthLabel(mes)}
        onPrev={() => setMes(shiftMonth(mes, -1))}
        onNext={() => setMes(shiftMonth(mes, 1))}
        canNext={mes < currentMonth()}
      />

      <Card className="mb-6 flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-zinc-500">Ingresos</p>
          <p className="font-semibold text-emerald-600">{formatMoney(resumen.ingresos, moneda)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Gastos</p>
          <p className="font-semibold text-red-600">{formatMoney(resumen.gastos, moneda)}</p>
        </div>
      </Card>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['todos', 'ingreso', 'gasto', 'transferencia'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              filtro === f ? 'bg-ink text-acid' : 'bg-mist text-ink hover:bg-zinc-200'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : f === 'gasto' ? 'Gastos' : 'Transferencias'}
          </button>
        ))}
      </div>

      {data.accounts.length === 0 && (
        <Empty>Primero crea una cuenta en la pestaña Más → Cuentas.</Empty>
      )}

      {data.accounts.length > 0 && filtradas.length === 0 && (
        <Empty>No hay movimientos en {monthLabel(mes).toLowerCase()}.</Empty>
      )}

      <div className="flex flex-col gap-3">
        {[...grupos.entries()].map(([fecha, items]) => (
          <section key={fecha} className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{dayLabel(fecha)}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  accounts={data.accounts}
                  categories={data.categories}
                  moneda={moneda}
                  presupuesto={colorPorCuenta(data.pagadosPresupuesto.get(t.id))}
                  esBolsillo={data.bolsillosPresupuesto.has(t.id) || !!t.bolsillo_id}
                  onClick={() => setEditing(t)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {data.accounts.length > 0 && (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-acid shadow-2xl transition active:scale-95 lg:hidden"
          aria-label="Nuevo movimiento"
        >
          <Icon className="h-6 w-6">{icons.plus}</Icon>
        </button>
      )}

      {editing && data && (
        <Sheet title={editing === 'new' ? 'Nuevo movimiento' : 'Editar movimiento'} onClose={() => setEditing(null)}>
          <TransactionForm
            accounts={data.accounts}
            categories={data.categories}
            bolsillos={data.bolsillos}
            initial={editing === 'new' ? null : editing}
            onSaved={close}
          />
        </Sheet>
      )}
    </>
  )
}
