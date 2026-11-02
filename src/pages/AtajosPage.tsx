import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Card, Empty, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { listAccounts, listShortcuts, saveShortcut, deleteShortcut } from '../lib/db'
import { useLoad } from '../lib/useLoad'
import type { Account } from '../lib/types'

export function AtajosPage() {
  const [sheet, setSheet] = useState(false)

  const loader = useCallback(async () => {
    const [accounts, shortcuts] = await Promise.all([listAccounts(), listShortcuts()])
    return { accounts, shortcuts }
  }, [])

  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  return (
    <>
      <PageHeader
        title="Atajos iOS"
        action={
          <button type="button" onClick={() => setSheet(true)} className={primaryBtn}>
            <Icon className="h-4 w-4">{icons.plus}</Icon>
            Nuevo
          </button>
        }
      />

      <p className="mb-6 text-sm text-zinc-500">
        Genera un token para usar con el Atajo de iOS. El token se muestra una sola vez.
      </p>

      <Card className="mb-6 p-5 text-sm text-ink/80">
        <p className="font-medium text-zinc-600">Cómo crear el atajo en iOS</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Toca "Nuevo", pon un nombre y elige la cuenta por defecto, luego "Generar token".</li>
          <li>Copia el token que se muestra (no se volverá a mostrar).</li>
          <li>Abre la app <strong>Atajos</strong> en iOS y crea un atajo nuevo.</li>
          <li>Agrega la acción <strong>"Obtener contenido de URL"</strong> y pega el endpoint de la app con el token.</li>
          <li>Configura el atajo para pedir el monto y la cuenta, y ejecútalo desde el widget o Siri.</li>
          <li>El token se valida automáticamente; si falla, genera uno nuevo.</li>
        </ol>
      </Card>

      {data.shortcuts.length === 0 ? (
        <Empty>Aún no tienes tokens. Crea uno para usar el atajo.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {data.shortcuts.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink">
                  <Icon className="h-5 w-5">{icons.llave}</Icon>
                </span>
                <div>
                  <p className="font-medium text-ink">{s.nombre}</p>
                  <p className="text-xs text-zinc-500">
                    {s.cuenta_nombre ?? 'Sin cuenta'} · {s.ultimo_uso ? `Último uso: ${s.ultimo_uso.slice(0, 10)}` : 'Sin usar'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('¿Eliminar este token?')) return
                  await deleteShortcut(s.id)
                  reload()
                }}
                className="text-red-600"
              >
                <Icon className="h-4 w-4">{icons.eliminar}</Icon>
              </button>
            </Card>
          ))}
        </div>
      )}

      {sheet && (
        <Sheet title="Nuevo token" onClose={() => setSheet(false)}>
          <ShortcutForm accounts={data.accounts} onSaved={() => { setSheet(false); reload() }} />
        </Sheet>
      )}
    </>
  )
}

function ShortcutForm({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  const [nombre, setNombre] = useState('Atajo iOS')
  const [cuentaId, setCuentaId] = useState(accounts[0]?.id ?? '')
  const [token, setToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await saveShortcut(nombre, cuentaId)
      setToken(result.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
      setSaving(false)
    }
  }

  if (token) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[24px] bg-ink p-5 text-white">
          <p className="text-xs text-zinc-400">Tu token (guárdalo en el atajo)</p>
          <p className="mt-2 break-all font-mono text-sm text-acid">{token}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(token)}
            className="mt-3 flex items-center gap-2 rounded-full bg-acid px-4 py-2 text-sm font-semibold text-ink transition active:scale-95"
          >
            <Icon className="h-4 w-4">{icons.check}</Icon>
            Copiar token
          </button>
        </div>
        <p className="text-sm text-zinc-600">
          Copia este token y pégalo en la acción "Obtener contenido de URL" del atajo.
          Este token no se volverá a mostrar.
        </p>
        <button type="button" onClick={onSaved} className={primaryBtn}>
          Listo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} className={inputCls} required />
      </Field>
      <Field label="Cuenta por defecto">
        <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Creando…' : 'Generar token'}
      </button>
    </form>
  )
}
