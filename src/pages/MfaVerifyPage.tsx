import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen, inputCls, primaryBtn } from '../components/ui'

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
    <AuthScreen>
      <div className="mt-16">
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-ink">
          Verificación
          <br />
          en dos pasos.
        </h1>
        <p className="mt-4 text-base text-ink/70">Abre KeePass y escribe el código TOTP de Finanzas.</p>
      </div>

      <form onSubmit={handleVerify} className="mt-10 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">
          Código de 6 dígitos
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} text-center text-2xl tracking-widest`}
            required
          />
        </label>

        {error && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <button type="submit" disabled={loading || code.length !== 6} className={primaryBtn}>
          {loading ? 'Verificando…' : 'Verificar'}
        </button>
      </form>

      <button type="button" onClick={signOut} className="mt-8 self-center text-sm text-ink/70 underline underline-offset-4">
        Cerrar sesión
      </button>
    </AuthScreen>
  )
}
