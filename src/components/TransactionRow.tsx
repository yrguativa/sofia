import { formatMoney } from '../lib/format'
import type { Account, Category, Transaction } from '../lib/types'

type Props = {
  tx: Transaction
  accounts: Account[]
  categories: Category[]
  moneda: string
  onClick?: () => void
}

export function TransactionRow({ tx, accounts, categories, moneda, onClick }: Props) {
  const cat = categories.find((c) => c.id === tx.category_id)
  const origen = accounts.find((a) => a.id === tx.account_id)
  const destino = accounts.find((a) => a.id === tx.cuenta_destino_id)

  const isTransfer = tx.tipo === 'transferencia'
  const title = isTransfer ? `Transferencia a ${destino?.nombre ?? '—'}` : (cat?.nombre ?? 'Sin categoría')
  const icon = isTransfer ? '🔁' : (cat?.icono ?? '•')
  const signo = tx.tipo === 'ingreso' ? '+' : tx.tipo === 'gasto' ? '−' : ''
  const color =
    tx.tipo === 'ingreso' ? 'text-emerald-600' : tx.tipo === 'gasto' ? 'text-red-600' : 'text-zinc-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[22px] bg-white p-3 pr-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mist text-xl">{icon}</span>
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
    </button>
  )
}
