import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { TransactionRow } from '../components/TransactionRow'
import { Card, Empty, ErrorText, Loading, SectionTitle } from '../components/ui'
import { getProfile, listAccounts, listCategories, listTransactions } from '../lib/db'
import { computeBalances, summarize } from '../lib/finance'
import { currentMonth, formatMoney, monthLabel, monthOf, shiftMonth } from '../lib/format'
import { useLoad } from '../lib/useLoad'

const acciones = [
  { to: '/movimientos', label: 'Movimiento', icon: icons.plus },
  { to: '/cuentas', label: 'Cuentas', icon: icons.cuentas },
  { to: '/presupuestos', label: 'Presupuesto', icon: icons.presupuestos },
  { to: '/metas', label: 'Metas', icon: icons.metas },
]

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
  const recientes = transactions.slice(0, 6)
  const nombre = profile.nombre ?? user?.email ?? ''
  const inicial = nombre.charAt(0).toUpperCase() || '?'

  const serie = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(mes, i - 5)
    return { mes: m, ...summarize(transactions.filter((t) => monthOf(t.fecha) === m)) }
  })
  const maximo = Math.max(1, ...serie.flatMap((s) => [s.ingresos, s.gastos]))
  const altura = (valor: number) => `${Math.max(4, (valor / maximo) * 100)}%`

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <header className="flex items-center gap-3 lg:col-span-12">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-acid text-lg font-bold text-ink">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">Bienvenido de nuevo</p>
          <h1 className="truncate text-xl font-bold text-ink lg:text-3xl lg:tracking-tight">Hola, {nombre}</h1>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[32px] bg-ink p-6 text-white lg:col-span-7 lg:p-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-acid/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-sm text-zinc-400">Saldo total</p>
          <span className="rounded-full bg-acid px-3 py-1 text-xs font-semibold text-ink">{monthLabel(mes)}</span>
        </div>
        <p className="relative mt-2 text-4xl font-bold tracking-tight lg:mt-4 lg:text-6xl">{formatMoney(total, moneda)}</p>
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:mt-10 lg:gap-4">
          <div className="rounded-2xl bg-white/5 p-4 lg:p-5">
            <p className="text-xs text-zinc-400">Ingresos del mes</p>
            <p className="mt-1 font-semibold text-acid lg:text-xl">{formatMoney(resumen.ingresos, moneda)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 lg:p-5">
            <p className="text-xs text-zinc-400">Gastos del mes</p>
            <p className="mt-1 font-semibold text-white lg:text-xl">{formatMoney(resumen.gastos, moneda)}</p>
          </div>
        </div>
      </section>

      <Card className="lg:col-span-5">
        <SectionTitle title="Accesos rápidos" />
        <nav className="grid grid-cols-4 gap-3">
          {acciones.map((a) => (
            <Link key={a.to} to={a.to} className="flex flex-col items-center gap-2 text-center text-xs font-medium text-ink">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mist text-ink transition hover:bg-acid active:scale-95">
                <Icon>{a.icon}</Icon>
              </span>
              {a.label}
            </Link>
          ))}
        </nav>
      </Card>

      <Card className="lg:col-span-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Estadísticas</h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-acid" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Gastos
            </span>
          </div>
        </div>
        <div className="flex h-40 items-end justify-between gap-2 lg:h-64 lg:gap-4">
          {serie.map((s) => (
            <div key={s.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <div className="w-3 rounded-full bg-acid lg:w-5" style={{ height: altura(s.ingresos) }} />
                <div className="w-3 rounded-full bg-ink lg:w-5" style={{ height: altura(s.gastos) }} />
              </div>
              <span className="text-[11px] text-zinc-500">{monthLabel(s.mes).slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Card>

      <section className="lg:col-span-5">
        <SectionTitle title="Cuentas" to="/cuentas" linkLabel="Ver todas" />
        {accounts.length === 0 ? (
          <Empty>
            Aún no tienes cuentas. <Link to="/cuentas" className="font-medium text-ink underline">Crea una</Link>.
          </Empty>
        ) : (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {accounts.map((a) => (
              <div key={a.id} className="min-w-44 shrink-0 rounded-[24px] bg-white p-5 shadow-sm lg:flex lg:min-w-0 lg:items-center lg:justify-between">
                <div>
                  <span className="mb-4 inline-block rounded-full bg-acid px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink lg:mb-2">
                    {a.tipo}
                  </span>
                  <p className="truncate font-medium text-zinc-600">{a.nombre}</p>
                </div>
                <p className="mt-1 text-lg font-bold text-ink lg:mt-0">{formatMoney(balances[a.id] ?? 0, moneda)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="lg:col-span-12">
        <SectionTitle title="Últimos movimientos" to="/movimientos" linkLabel="Ver todos" />
        {recientes.length === 0 ? (
          <Empty>Sin movimientos todavía.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recientes.map((t) => (
              <TransactionRow key={t.id} tx={t} accounts={accounts} categories={categories} moneda={moneda} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
