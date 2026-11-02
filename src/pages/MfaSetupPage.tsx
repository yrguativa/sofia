import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { AuthScreen, inputCls, primaryBtn } from '../components/ui'

type Enrollment = {
  factorId: string
  qr: string
  secret: string
  uri: string
}

function qrSrc(qr: string) {
  return qr.startsWith('data:') ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`
}

export function MfaSetupPage() {
  const { refreshStatus, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function enroll() {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const pending = (factors?.all ?? []).filter(
        (f) => f.factor_type === 'totp' && (f.status as string) === 'unverified',
      )
      for (const f of pending) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Finanzas (KeePass)',
      })
      if (error || !data) {
        setError('No se pudo iniciar la configuración de MFA. Recarga la página.')
        return
      }
      setEnrollment({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      })
    }

    enroll()
  }, [])

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!enrollment) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    })

    if (error) {
      setError('Código incorrecto. Revisa la hora de tu teléfono y vuelve a intentar.')
      setLoading(false)
      return
    }

    await refreshStatus()
  }

  return (
    <AuthScreen>
      <div className="mt-12">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink">Activa la verificación en dos pasos</h1>
        <p className="mt-3 text-sm text-ink/70">
          Es obligatoria para proteger tus finanzas. Guarda el código en KeePass: en la entrada de Finanzas, agrega un
          campo TOTP escaneando el QR o pegando la clave.
        </p>
      </div>

      {!enrollment && !error && <p className="mt-10 text-ink/70">Generando código…</p>}

      {enrollment && (
        <div className="mt-8 flex flex-col items-center gap-5">
          <img
            src={qrSrc(enrollment.qr)}
            alt="Código QR para configurar TOTP"
            className="h-56 w-56 rounded-[28px] bg-white p-3"
          />

          <div className="w-full rounded-[24px] bg-white p-5 text-sm">
            <p className="font-medium text-zinc-600">Clave manual (para KeePass)</p>
            <code className="mt-2 block break-all font-mono text-ink">{enrollment.secret}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(enrollment.secret)}
              className="mt-3 font-medium text-ink underline underline-offset-4"
            >
              Copiar clave
            </button>
          </div>

          <form onSubmit={handleVerify} className="flex w-full flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Código de 6 dígitos
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} text-center text-2xl tracking-widest`}
                required
              />
            </label>
            {error && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className={primaryBtn}>
              {loading ? 'Verificando…' : 'Activar y continuar'}
            </button>
          </form>
        </div>
      )}

      {!enrollment && error && <p className="mt-10 rounded-2xl bg-white px-4 py-3 text-sm text-red-700">{error}</p>}

      <button type="button" onClick={signOut} className="mt-10 self-center text-sm text-ink/70 underline underline-offset-4">
        Cerrar sesión
      </button>
    </AuthScreen>
  )
}
