import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TransactionRow } from '../components/TransactionRow'
import { Card, Empty, ErrorText, Loading, PageHeader } from '../components/ui'
import { getProfile, listAccounts, listCategories, listTransactions } from '../lib/db'
import { computeBalances, summarize } from '../lib/finance'
import { currentMonth, formatMoney, monthLabel, monthOf } from '../lib/format'
import { useLoad } from '../lib/useLoad'

export function DashboardPage() {
  const { user } = useAuth()

  const loader = useCallback(async () => {
    const [profile, accounts, categories, transactions] = await Promise.all([
      getProfile(),
      listAccounts(),
      listCategories(),
      listTransactions(),
    ])
    return { profile, accounts, categories, transactions }
  }, [])

  const { data, error } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const { profile, accounts, categories, transactions } = data
  const moneda = profile.moneda
  const balances = computeBalances(accounts, transactions)
  const total = accounts.reduce((sum, a) => sum + (balances[a.id] ?? 0), 0)

  const mes = currentMonth()
  const resumen = summarize(transactions.filter((t) => monthOf(t.fecha) === mes))
  const recientes = transactions.slice(0, 5)
  const nombre = profile.nombre ?? user?.email

  return (
    <>
      <PageHeader title={`Hola, ${nombre}`} />

      <section className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-sm text-slate-300">Saldo total</p>
        <p className="mt-1 text-3xl font-bold">{formatMoney(total, moneda)}</p>
        <p className="mt-4 text-xs text-slate-400">{monthLabel(mes)}</p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400">Ingresos</p>
            <p className="font-semibold text-emerald-300">{formatMoney(resumen.ingresos, moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Gastos</p>
            <p className="font-semibold text-red-300">{formatMoney(resumen.gastos, moneda)}</p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Cuentas</h2>
          <Link to="/cuentas" className="text-sm text-slate-500 underline">Ver todas</Link>
        </div>
        {accounts.length === 0 ? (
          <Empty>
            Aún no tienes cuentas. <Link to="/cuentas" className="underline">Crea una</Link>.
          </Empty>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {accounts.map((a) => (
              <Card key={a.id} className="min-w-40 shrink-0 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{a.tipo}</p>
                <p className="truncate font-medium text-slate-900">{a.nombre}</p>
                <p className="mt-2 font-semibold text-slate-900">{formatMoney(balances[a.id] ?? 0, moneda)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Últimos movimientos</h2>
          <Link to="/movimientos" className="text-sm text-slate-500 underline">Ver todos</Link>
        </div>
        {recientes.length === 0 ? (
          <Empty>Sin movimientos todavía.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {recientes.map((t) => (
              <TransactionRow key={t.id} tx={t} accounts={accounts} categories={categories} moneda={moneda} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
