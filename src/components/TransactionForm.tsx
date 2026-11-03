import { useState, type FormEvent } from 'react'
import { deleteTransaction, saveTransaction, updateBolsilloSaldo } from '../lib/db'
import { todayISO } from '../lib/format'
import { parseMoney } from '../lib/money'
import type { Account, Bolsillo, Category, Transaction, TxType } from '../lib/types'
import { MoneyInput } from './MoneyInput'
import { Field, dangerBtn, inputCls, primaryBtn } from './ui'

type Props = {
  accounts: Account[]
  categories: Category[]
  bolsillos: Bolsillo[]
  initial: Transaction | null
  onSaved: () => void
}

const tipos: { value: TxType; label: string }[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'transferencia', label: 'Transferencia' },
]

export function TransactionForm({ accounts, categories, bolsillos, initial, onSaved }: Props) {
  const [tipo, setTipo] = useState<TxType>(initial?.tipo ?? 'gasto')
  const [monto, setMonto] = useState(initial ? String(initial.monto) : '')
  const [accountId, setAccountId] = useState(initial?.account_id ?? accounts[0]?.id ?? '')
  const [destinoId, setDestinoId] = useState(initial?.cuenta_destino_id ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [bolsilloId, setBolsilloId] = useState(initial?.bolsillo_id ?? '')
  const [fecha, setFecha] = useState(initial?.fecha ?? todayISO())
  const [nota, setNota] = useState(initial?.nota ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoriasDisponibles = categories.filter((c) => c.tipo === tipo)
  const bolsillosDeCuenta = bolsillos.filter((b) => b.account_id === accountId)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const valor = parseMoney(monto)
    if (!(valor > 0)) return setError('El monto debe ser mayor que cero.')
    if (!accountId) return setError('Crea una cuenta antes de registrar movimientos.')
    if (tipo === 'transferencia') {
      if (!destinoId) return setError('Elige la cuenta destino.')
      if (destinoId === accountId) return setError('La cuenta destino debe ser distinta.')
    }

    setSaving(true)
    try {
      const bolsilloSeleccionado = bolsilloId || null
      await saveTransaction(
        {
          account_id: accountId,
          cuenta_destino_id: tipo === 'transferencia' ? destinoId : null,
          category_id: tipo === 'transferencia' ? null : categoryId || null,
          bolsillo_id: tipo === 'transferencia' ? null : bolsilloSeleccionado,
          monto: valor,
          tipo,
          fecha,
          nota: nota.trim() || null,
        },
        initial?.id,
      )
      // Actualizar saldo del bolsillo (debitar en gastos, acreditar en ingresos)
      if (bolsilloSeleccionado && tipo !== 'transferencia') {
        const delta = tipo === 'gasto' ? -valor : valor
        await updateBolsilloSaldo(bolsilloSeleccionado, delta)
      }
      // Si se editó y cambió de bolsillo, revertir el anterior
      if (initial?.bolsillo_id && initial.bolsillo_id !== bolsilloSeleccionado) {
        const deltaRevert = initial.tipo === 'gasto' ? initial.monto : -initial.monto
        await updateBolsilloSaldo(initial.bolsillo_id, deltaRevert)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (!window.confirm('¿Eliminar este movimiento?')) return
    setSaving(true)
    try {
      if (initial.bolsillo_id) {
        const deltaRevert = initial.tipo === 'gasto' ? initial.monto : -initial.monto
        await updateBolsilloSaldo(initial.bolsillo_id, deltaRevert)
      }
      await deleteTransaction(initial.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-full bg-mist p-1.5">
        {tipos.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setTipo(t.value)
              setCategoryId('')
            }}
            className={`rounded-full py-2.5 text-sm font-medium transition ${tipo === t.value ? 'bg-ink text-acid' : 'text-zinc-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Monto">
        <MoneyInput
          value={monto}
          onChange={setMonto}
          placeholder="0"
          className={`${inputCls} text-2xl font-semibold`}
          required
        />
      </Field>

      <Field label={tipo === 'transferencia' ? 'Desde' : 'Cuenta'}>
        <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setBolsilloId('') }} className={inputCls} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Field>

      {bolsillosDeCuenta.length > 0 && (
        <Field label="Bolsillo (opcional)">
          <select value={bolsilloId} onChange={(e) => setBolsilloId(e.target.value)} className={inputCls}>
            <option value="">Sin bolsillo</option>
            {bolsillosDeCuenta.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </Field>
      )}

      {tipo === 'transferencia' ? (
        <Field label="Hacia">
          <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className={inputCls} required>
            <option value="">Elige una cuenta</option>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
          </select>
        </Field>
      ) : (
        <Field label="Categoría">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">Sin categoría</option>
            {categoriasDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono ? `${c.icono} ` : ''}
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Fecha">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} required />
      </Field>

      <Field label="Nota (opcional)">
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} className={inputCls} />
      </Field>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Registrar'}
      </button>

      {initial && (
        <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
          Eliminar movimiento
        </button>
      )}
    </form>
  )
}
