import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Icon, icons } from '../components/icons'
import { AuthScreen, Field, inputCls, primaryBtn } from '../components/ui'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const { refreshStatus } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Correo o contraseña incorrectos.')
      else await refreshStatus()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Te enviamos un correo para confirmar tu cuenta.')
      else await refreshStatus()
    }

    setLoading(false)
  }

  async function handleReset() {
    setError(null)
    setInfo(null)
    if (!email) {
      setError('Escribe tu correo para recuperar la contraseña.')
      return
    }
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) setError(error.message)
    else setInfo('Si el correo existe, recibirás un enlace para restablecer tu contraseña.')
  }

  const isLogin = mode === 'login'

  return (
    <AuthScreen>
      <div className="mt-16">
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-ink">
          {isLogin ? 'Tus finanzas,' : 'Empieza hoy,'}
          <br />
          {isLogin ? 'bajo control.' : 'sin complicaciones.'}
        </h1>
        <p className="mt-4 text-base text-ink/70">{isLogin ? 'Inicia sesión para continuar.' : 'Crea tu cuenta.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4" autoComplete="on">
        {!isLogin && (
          <Field label="Nombre">
            <input
              name="name"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
        )}

        <Field label="Correo">
          <input
            type="email"
            name="username"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Contraseña" hint={isLogin ? undefined : 'Mínimo 12 caracteres. Guárdala en KeePass.'}>
          <input
            type="password"
            name="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            required
          />
        </Field>

        {error && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {info && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-emerald-700" role="status">{info}</p>}

        <button type="submit" disabled={loading} className={`${primaryBtn} mt-2 w-full justify-between pl-6 pr-2`}>
          {loading ? 'Procesando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-acid text-ink">
            <Icon className="h-5 w-5">{icons.arrow}</Icon>
          </span>
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login')
            setError(null)
            setInfo(null)
          }}
          className="font-medium text-ink underline underline-offset-4"
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
        </button>
        {isLogin && (
          <button type="button" onClick={handleReset} className="text-ink/70 underline underline-offset-4">
            Olvidé mi contraseña
          </button>
        )}
      </div>
    </AuthScreen>
  )
}
