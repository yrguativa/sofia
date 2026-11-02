import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type AuthStatus } from './AuthContext'

export const routeFor: Record<Exclude<AuthStatus, 'loading'>, string> = {
  signed_out: '/login',
  mfa_enroll: '/mfa/setup',
  mfa_verify: '/mfa/verify',
  ready: '/',
}

export function Guard({ allow, children }: { allow: AuthStatus; children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">Cargando…</div>
    )
  }

  if (status !== allow) {
    return <Navigate to={routeFor[status]} replace />
  }

  return <>{children}</>
}
