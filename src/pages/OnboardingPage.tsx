import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PageHeader, primaryBtn, secondaryBtn } from '../components/ui'
import { updateProfile } from '../lib/db'
import { useAuth } from '../auth/AuthContext'

const pasos = [
  {
    titulo: 'Configura tu salario',
    texto: 'En Más → Salario registra tu sueldo y desde qué mes aplica. Sin salario no se puede generar el presupuesto.',
    imagen: `${import.meta.env.BASE_URL}onboarding/01-salario.png`,
  },
  {
    titulo: 'Crea tus categorías',
    texto: 'En Más → Categorías agrega las categorías de tus gastos e ingresos (ej. Arriendo, Servicios).',
    imagen: `${import.meta.env.BASE_URL}onboarding/02-categorias.png`,
  },
  {
    titulo: 'Arma tu plantilla',
    texto: 'En Plantilla define tus gastos recurrentes: fijos, variables, deudas y ahorros. Puedes usar % del salario.',
    imagen: `${import.meta.env.BASE_URL}onboarding/03-plantilla.png`,
  },
  {
    titulo: 'Genera el presupuesto del mes',
    texto: 'En Presupuesto configura el salario del mes y pulsa "Generar desde plantilla". Luego marca cada ítem como pagado.',
    imagen: `${import.meta.env.BASE_URL}onboarding/04-presupuesto.png`,
  },
  {
    titulo: 'Activa la verificación en dos pasos',
    texto: 'Ya está activa. Guarda el código TOTP en KeePass o en la app Contraseñas/Aegis para entrar.',
    imagen: `${import.meta.env.BASE_URL}onboarding/05-seguridad.png`,
  },
  {
    titulo: 'Usa los atajos (opcional)',
    texto: 'En Más → Atajos iOS genera un token para registrar movimientos rápidos desde tu iPhone.',
    imagen: `${import.meta.env.BASE_URL}onboarding/06-atajos.png`,
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
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={actual.imagen} alt={actual.titulo} className="h-40 w-40 object-contain" />
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