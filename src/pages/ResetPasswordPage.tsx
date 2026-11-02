import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorText, Field, inputCls, primaryBtn } from '../components/ui'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 12) return setError('La contraseña debe tener al menos 12 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')

    setSaving(true)
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setSaving(false)
      return setError('El enlace venció o ya fue usado. Pide uno nuevo desde la pantalla de login.')
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setSaving(false)
      return setError(error.message)
    }

    await supabase.auth.signOut()
    window.alert('Contraseña actualizada. Guárdala en KeePass y vuelve a iniciar sesión.')
    navigate('/login', { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
      <p className="mt-1 text-slate-500">Mínimo 12 caracteres.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" autoComplete="on">
        <Field label="Nueva contraseña">
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Repite la contraseña">
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={12}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            required
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  )
}
