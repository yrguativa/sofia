import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { Card, ErrorText, Field, Loading, PageHeader, inputCls, primaryBtn, secondaryBtn } from '../components/ui'
import { getProfile, updateProfile } from '../lib/db'
import { useLoad } from '../lib/useLoad'
import type { Profile } from '../lib/types'

const monedas = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL']

export function MorePage() {
  const { signOut } = useAuth()

  const loader = useCallback(() => getProfile(), [])
  const { data, error, reload } = useLoad(loader)

  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />

  return (
    <>
      <PageHeader title="Más" />

      <Card className="mb-6 flex flex-col divide-y divide-mist p-0">
        <MenuLink to="/cuentas" label="Cuentas" />
        <MenuLink to="/categorias" label="Categorías" />
        <MenuLink to="/plantilla" label="Plantilla de presupuesto" />
        <MenuLink to="/simulador" label="Simulador" />
      </Card>

      <Card className="mb-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">Perfil</h2>
        <ProfileForm profile={data} onSaved={reload} />
      </Card>

      <section className="mb-6 rounded-[28px] bg-ink p-6 text-white">
        <h2 className="font-semibold text-acid">Seguridad</h2>
        <p className="mt-2 text-sm text-zinc-400">
          La verificación en dos pasos está activa. Tus códigos se guardan en KeePass.
        </p>
      </section>

      <button type="button" onClick={signOut} className={`${secondaryBtn} w-full`}>
        Cerrar sesión
      </button>
    </>
  )
}

function MenuLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-5 py-4 font-medium text-ink transition active:bg-mist">
      {label}
      <span className="text-zinc-400">
        <Icon className="h-4 w-4">{icons.chevronRight}</Icon>
      </span>
    </Link>
  )
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [nombre, setNombre] = useState(profile.nombre ?? '')
  const [moneda, setMoneda] = useState(profile.moneda)
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await updateProfile({ nombre: nombre.trim(), moneda })
      setInfo('Perfil actualizado.')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} className={inputCls} />
      </Field>
      <Field label="Moneda">
        <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputCls}>
          {monedas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      {info && <p className="text-sm text-emerald-700" role="status">{info}</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  )
}
