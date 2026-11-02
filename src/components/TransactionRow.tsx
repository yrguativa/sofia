import { formatMoney } from '../lib/format'
import type { Account, Category, Transaction } from '../lib/types'
import { Icon } from './icons'
import { icons, tipoMovimientoIcon } from './iconPaths'

type Props = {
  tx: Transaction
  accounts: Account[]
  categories: Category[]
  moneda: string
  presupuesto?: 'verde' | 'amarillo'
  onClick?: () => void
}

const fondos = {
  neutro: 'bg-white',
  verde: 'bg-emerald-50 ring-1 ring-emerald-200',
  amarillo: 'bg-amber-50 ring-1 ring-amber-200',
} as const

const estilos = {
  ingreso: 'bg-emerald-50 text-emerald-700',
  gasto: 'bg-red-50 text-red-600',
  transferencia: 'bg-mist text-zinc-600',
} as const

export function TransactionRow({ tx, accounts, categories, moneda, presupuesto, onClick }: Props) {
  const cat = categories.find((c) => c.id === tx.category_id)
  const origen = accounts.find((a) => a.id === tx.account_id)
  const destino = accounts.find((a) => a.id === tx.cuenta_destino_id)

  const isTransfer = tx.tipo === 'transferencia'
  const title = isTransfer ? `Transferencia a ${destino?.nombre ?? '—'}` : (cat?.nombre ?? 'Sin categoría')
  const signo = tx.tipo === 'ingreso' ? '+' : tx.tipo === 'gasto' ? '−' : ''
  const color =
    tx.tipo === 'ingreso' ? 'text-emerald-600' : tx.tipo === 'gasto' ? 'text-red-600' : 'text-zinc-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[22px] p-3 pr-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${fondos[presupuesto ?? 'neutro']}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${estilos[tx.tipo]}`}>
        <Icon className="h-5 w-5">{tipoMovimientoIcon[tx.tipo]}</Icon>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-zinc-500">
          {origen?.nombre}
          {tx.nota ? ` · ${tx.nota}` : ''}
        </span>
      </span>
      <span className={`whitespace-nowrap font-semibold ${color}`}>
        {signo}
        {formatMoney(tx.monto, moneda)}
      </span>
      <span className="hidden text-zinc-300 transition group-hover:text-ink lg:block">
        <Icon className="h-4 w-4">{icons.chevronRight}</Icon>
      </span>
    </button>
  )
}
