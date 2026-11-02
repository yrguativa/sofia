import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Finanzas</h1>
      <p className="mt-1 text-slate-500">
        {isLogin ? 'Inicia sesión para continuar.' : 'Crea tu cuenta.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-4"
        autoComplete="on"
      >
        {!isLogin && (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nombre
            <input
              name="name"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-900"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Correo
          <input
            type="email"
            name="username"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-900"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-900"
            required
          />
          {!isLogin && (
            <span className="text-xs font-normal text-slate-500">
              Mínimo 12 caracteres. Guárdala en KeePass.
            </span>
          )}
        </label>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {info && <p className="text-sm text-emerald-700" role="status">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Procesando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login')
            setError(null)
            setInfo(null)
          }}
          className="text-slate-700 underline"
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
        </button>
        {isLogin && (
          <button type="button" onClick={handleReset} className="text-slate-500 underline">
            Olvidé mi contraseña
          </button>
        )}
      </div>
    </main>
  )
}
