import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col divide-y divide-mist p-0">
            <MenuLink to="/cuentas" label="Cuentas" icon={icons.cuentas} />
            <MenuLink to="/categorias" label="Categorías" icon={icons.categorias} />
            <MenuLink to="/plantilla" label="Plantilla de presupuesto" icon={icons.plantilla} />
            <MenuLink to="/simulador" label="Simulador" icon={icons.simulador} />
        <MenuLink to="/atajos" label="Atajos iOS" icon={icons.llave} />
          </Card>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-acid text-ink">
                <Icon className="h-5 w-5">{icons.seguridad}</Icon>
              </span>
              <h2 className="font-semibold text-acid">Seguridad</h2>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              La verificación en dos pasos está activa. Tus códigos se guardan en KeePass.
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink">
                <Icon className="h-5 w-5">{icons.usuario}</Icon>
              </span>
              <h2 className="text-lg font-semibold text-ink">Perfil</h2>
            </div>
            <ProfileForm profile={data} onSaved={reload} />
          </Card>

          <button type="button" onClick={signOut} className={`${secondaryBtn} w-full gap-2`}>
            <Icon className="h-4 w-4">{icons.logout}</Icon>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}

function MenuLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-4 px-5 py-4 font-medium text-ink transition active:bg-mist hover:bg-mist/60">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist">
        <Icon className="h-5 w-5">{icon}</Icon>
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-zinc-400">
        <Icon className="h-4 w-4">{icons.chevronRight}</Icon>
      </span>
    </Link>
  )
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [nombre, setNombre] = useState(profile.nombre ?? '')
  const [moneda, setMoneda] = useState(profile.moneda)
  const [diaPago, setDiaPago] = useState(String(profile.dia_pago))
  const [saving, setSaving] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await updateProfile({ nombre: nombre.trim(), moneda, dia_pago: Number(diaPago) })
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
      <Field
        label="Día de pago del salario"
        hint="Hasta ese día, Presupuesto y Movimientos muestran el mes anterior."
      >
        <select value={diaPago} onChange={(e) => setDiaPago(e.target.value)} className={inputCls}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Día {d}
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
