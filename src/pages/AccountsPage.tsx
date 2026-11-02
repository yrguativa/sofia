import { MoneyInput } from '../components/MoneyInput'
import { parseMoney } from '../lib/money'
import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, dangerBtn, inputCls, primaryBtn } from '../components/ui'
import { deleteAccount, getProfile, listAccounts, listBolsillos, listTransactions, saveAccount, saveBolsillo, deleteBolsillo } from '../lib/db'
import { Icon } from '../components/icons'
import { icons, tipoCuentaIcon } from '../components/iconPaths'
import { computeBalances } from '../lib/finance'
import { formatMoney } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import type { Account, AccountType } from '../lib/types'

const tipos: { value: AccountType; label: string }[] = [
  { value: 'banco', label: 'Banco' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta de crédito' },
  { value: 'ahorro', label: 'Ahorro' },
]

export function AccountsPage() {
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [bolsilloSheet, setBolsilloSheet] = useState(false)

  const loader = useCallback(async () => {
    const [profile, accounts, transactions, bolsillos] = await Promise.all([getProfile(), listAccounts(), listTransactions(), listBolsillos()])
    return { profile, accounts, transactions, bolsillos }
  }, [])

  const { data, error, reload } = useLoad(loader)

  function close() {
    setEditing(null)
    reload()
  }

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  const balances = computeBalances(data.accounts, data.transactions)
  const total = data.accounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Cuentas"
        action={
          <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
            + Nueva
          </button>
        }
      />

      <section className="mb-6 rounded-[28px] bg-ink p-6 text-white">
        <p className="text-sm text-zinc-400">Patrimonio total</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-acid">{formatMoney(total, data.profile.moneda)}</p>
      </section>

      {data.accounts.length === 0 ? (
        <Empty>Crea tu primera cuenta: efectivo, banco, tarjeta o ahorro.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => setEditing(a)} className="text-left transition active:scale-[0.99]">
              <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acid text-ink">
                    <Icon className="h-5 w-5">{tipoCuentaIcon[a.tipo]}</Icon>
                  </span>
                  <div>
                    <p className="font-medium text-ink">{a.nombre}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {tipos.find((t) => t.value === a.tipo)?.label}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-ink">{formatMoney(balances[a.id] ?? 0, data.profile.moneda)}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Bolsillos</h2>
          <button type="button" onClick={() => setBolsilloSheet(true)} className={primaryBtn}>
            + Nuevo
          </button>
        </div>
        {data.bolsillos.length === 0 ? (
          <Empty>Crea bolsillos dentro de tus cuentas para reservar dinero.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.bolsillos.map((b) => {
              const cuenta = data.accounts.find((a) => a.id === b.account_id)
              return (
                <Card key={b.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun text-ink">
                      <Icon className="h-5 w-5">{icons.llave}</Icon>
                    </span>
                    <div>
                      <p className="font-medium text-ink">{b.nombre}</p>
                      <p className="text-xs text-zinc-500">{cuenta?.nombre ?? 'Cuenta'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{formatMoney(b.saldo, data.profile.moneda)}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`¿Eliminar "${b.nombre}"?`)) return
                        await deleteBolsillo(b.id)
                        reload()
                      }}
                      className="text-red-600"
                    >
                      <Icon className="h-4 w-4">{icons.eliminar}</Icon>
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {bolsilloSheet && (
        <Sheet title="Nuevo bolsillo" onClose={() => setBolsilloSheet(false)}>
          <BolsilloForm accounts={data.accounts} onSaved={() => { setBolsilloSheet(false); reload() }} />
        </Sheet>
      )}

      {editing && (
        <Sheet title={editing === 'new' ? 'Nueva cuenta' : 'Editar cuenta'} onClose={() => setEditing(null)}>
          <AccountForm account={editing === 'new' ? null : editing} onSaved={close} />
        </Sheet>
      )}
    </>
  )
}

function AccountForm({ account, onSaved }: { account: Account | null; onSaved: () => void }) {
  const [nombre, setNombre] = useState(account?.nombre ?? '')
  const [tipo, setTipo] = useState<AccountType>(account?.tipo ?? 'banco')
  const [saldo, setSaldo] = useState(account ? String(account.saldo_inicial) : '0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await saveAccount(
        { nombre: nombre.trim(), tipo, saldo_inicial: parseMoney(saldo) },
        account?.id,
      )
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!account) return
    if (!window.confirm(`¿Eliminar "${account.nombre}"? Se borrarán también sus movimientos.`)) return
    setSaving(true)
    try {
      await deleteAccount(account.id)
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
      <Field label="Tipo">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as AccountType)} className={inputCls}>
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Saldo inicial" hint="Saldo con el que empiezas a registrar movimientos.">
        <MoneyInput value={saldo} onChange={setSaldo} />
      </Field>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {account && (
        <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
          Eliminar cuenta
        </button>
      )}
    </form>
  )
}

function BolsilloForm({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [nombre, setNombre] = useState('')
  const [saldo, setSaldo] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!accountId) return setError('Selecciona una cuenta.')
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    try {
      await saveBolsillo(accountId, nombre, parseMoney(saldo))
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Cuenta">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nombre del bolsillo">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} className={inputCls} required />
      </Field>
      <Field label="Saldo inicial">
        <MoneyInput value={saldo} onChange={setSaldo} className={inputCls} />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
