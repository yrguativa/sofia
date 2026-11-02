import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthScreen, ErrorText, Field, inputCls, primaryBtn } from '../components/ui'
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
    <AuthScreen>
      <div className="mt-16">
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-ink">
          Nueva
          <br />
          contraseña.
        </h1>
        <p className="mt-4 text-base text-ink/70">Mínimo 12 caracteres.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4" autoComplete="on">
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

        <button type="submit" disabled={saving} className={`${primaryBtn} mt-2`}>
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthScreen>
  )
}
