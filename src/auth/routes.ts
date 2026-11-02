import type { AuthStatus } from './AuthContext'

export const routeFor: Record<Exclude<AuthStatus, 'loading'>, string> = {
  signed_out: '/login',
  mfa_enroll: '/mfa/setup',
  mfa_verify: '/mfa/verify',
  ready: '/',
}
