import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export function MfaVerifyPage() {
  const { refreshStatus, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp.find((f) => f.status === 'verified')
    if (!factor) {
      await refreshStatus()
      return
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code,
    })

    if (error) {
      setError('Código incorrecto o vencido. Usa el código actual de KeePass.')
      setLoading(false)
      return
    }

    await refreshStatus()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Verificación en dos pasos</h1>
      <p className="mt-2 text-sm text-slate-600">
        Abre KeePass y escribe el código TOTP de Finanzas.
      </p>

      <form onSubmit={handleVerify} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Código de 6 dígitos
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl tracking-widest outline-none focus:border-slate-900"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Verificando…' : 'Verificar'}
        </button>
      </form>

      <button type="button" onClick={signOut} className="mt-8 text-sm text-slate-500 underline">
        Cerrar sesión
      </button>
    </main>
  )
}
