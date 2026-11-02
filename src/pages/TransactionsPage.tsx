import { useCallback, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionRow } from '../components/TransactionRow'
import { colorPorCuenta } from '../components/estadoPago'
import { Empty, ErrorText, Loading, MonthSwitcher, PageHeader, primaryBtn } from '../components/ui'
import { listAccounts, listCategories, getProfile, listEntries, listTransactions } from '../lib/db'
import { currentMonth, dayLabel, mesDePresupuesto, monthLabel, monthRange, shiftMonth } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import type { Transaction } from '../lib/types'

export function TransactionsPage() {
  const perfil = useLoad(getProfile)

  if (perfil.error) return <ErrorText>{perfil.error}</ErrorText>
  if (!perfil.data) return <Loading />

  return <TransactionsContent mesInicial={mesDePresupuesto(new Date(), perfil.data.dia_pago)} />
}

function TransactionsContent({ mesInicial }: { mesInicial: string }) {
  const [mes, setMes] = useState(mesInicial)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const loader = useCallback(async () => {
    const [profile, accounts, categories, transactions, entries] = await Promise.all([
      getProfile(),
      listAccounts(),
      listCategories(),
      listTransactions(monthRange(mes)),
      listEntries(mes),
    ])
    const nombreCuenta = new Map(accounts.map((a) => [a.id, a.nombre]))
    const pagadosPresupuesto = new Map<string, string>()
    for (const e of entries) {
      if (e.transaction_id && e.cuenta_id) {
        pagadosPresupuesto.set(e.transaction_id, nombreCuenta.get(e.cuenta_id) ?? '')
      }
    }
    return { profile, accounts, categories, transactions, pagadosPresupuesto }
  }, [mes])

  const { data, error, reload } = useLoad(loader)

  function close() {
    setEditing(null)
    reload()
  }

  const grupos = new Map<string, Transaction[]>()
  for (const t of data?.transactions ?? []) {
    grupos.set(t.fecha, [...(grupos.get(t.fecha) ?? []), t])
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        action={
          data && data.accounts.length > 0 ? (
            <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
              + Nuevo
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

      {error && <ErrorText>{error}</ErrorText>}
      {!data && !error && <Loading />}

      {data && data.accounts.length === 0 && (
        <Empty>Primero crea una cuenta en la pestaña Más → Cuentas.</Empty>
      )}

      {data && data.accounts.length > 0 && data.transactions.length === 0 && (
        <Empty>No hay movimientos en {monthLabel(mes).toLowerCase()}.</Empty>
      )}

      {data &&
        [...grupos.entries()].map(([fecha, items]) => (
          <section key={fecha} className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{dayLabel(fecha)}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  accounts={data.accounts}
                  categories={data.categories}
                  moneda={data.profile.moneda}
                  presupuesto={colorPorCuenta(data.pagadosPresupuesto.get(t.id))}
                  onClick={() => setEditing(t)}
                />
              ))}
            </div>
          </section>
        ))}

      {editing && data && (
        <Sheet title={editing === 'new' ? 'Nuevo movimiento' : 'Editar movimiento'} onClose={() => setEditing(null)}>
          <TransactionForm
            accounts={data.accounts}
            categories={data.categories}
            initial={editing === 'new' ? null : editing}
            onSaved={close}
          />
        </Sheet>
      )}
    </>
  )
}
