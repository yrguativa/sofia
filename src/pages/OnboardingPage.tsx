import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PageHeader, primaryBtn, secondaryBtn } from '../components/ui'
import { Icon } from '../components/icons'
import { icons } from '../components/iconPaths'
import { updateProfile } from '../lib/db'
import { useAuth } from '../auth/AuthContext'

const pasos = [
  {
    titulo: 'Configura tu salario',
    texto: 'En Más → Salario registra tu sueldo y desde qué mes aplica. Sin salario no se puede generar el presupuesto.',
    icono: icons.salario,
  },
  {
    titulo: 'Crea tus categorías',
    texto: 'En Más → Categorías agrega las categorías de tus gastos e ingresos (ej. Arriendo, Servicios).',
    icono: icons.categorias,
  },
  {
    titulo: 'Arma tu plantilla',
    texto: 'En Plantilla define tus gastos recurrentes: fijos, variables, deudas y ahorros. Puedes usar % del salario.',
    icono: icons.plantilla,
  },
  {
    titulo: 'Genera el presupuesto del mes',
    texto: 'En Presupuesto configura el salario del mes y pulsa "Generar desde plantilla". Luego marca cada ítem como pagado.',
    icono: icons.presupuestos,
  },
  {
    titulo: 'Activa la verificación en dos pasos',
    texto: 'Ya está activa. Guarda el código TOTP en KeePass o en la app Contraseñas/Aegis para entrar.',
    icono: icons.seguridad,
  },
  {
    titulo: 'Usa los atajos (opcional)',
    texto: 'En Más → Atajos iOS genera un token para registrar movimientos rápidos desde tu iPhone.',
    icono: icons.llave,
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshStatus } = useAuth()
  const [paso, setPaso] = useState(0)
  const [saving, setSaving] = useState(false)

  async function finalizar() {
    setSaving(true)
    try {
      await updateProfile({ onboarding_visto: true })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setSaving(false)
      navigate('/')
    }
  }

  const actual = pasos[paso]

  return (
    <>
      <PageHeader title="Bienvenido a Finanzas" />
      <Card className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-acid">
            <Icon className="h-6 w-6">{actual.icono}</Icon>
          </span>
          <div>
            <p className="text-xs text-zinc-500">Paso {paso + 1} de {pasos.length}</p>
            <h2 className="text-xl font-bold text-ink">{actual.titulo}</h2>
          </div>
        </div>
        <p className="text-sm text-zinc-600">{actual.texto}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className={`${secondaryBtn} flex-1 disabled:opacity-40`}
          >
            Anterior
          </button>
          {paso < pasos.length - 1 ? (
            <button type="button" onClick={() => setPaso((p) => p + 1)} className={`${primaryBtn} flex-1`}>
              Siguiente
            </button>
          ) : (
            <button type="button" onClick={finalizar} disabled={saving} className={`${primaryBtn} flex-1`}>
              {saving ? 'Guardando…' : 'Comenzar'}
            </button>
          )}
        </div>
        <button type="button" onClick={finalizar} className="self-center text-sm text-zinc-500 underline underline-offset-4">
          Saltar onboarding
        </button>
      </Card>
    </>
  )
}