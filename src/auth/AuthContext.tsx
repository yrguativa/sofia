import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AuthStatus = 'loading' | 'signed_out' | 'mfa_enroll' | 'mfa_verify' | 'ready'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  refreshStatus: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  const refreshStatus = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session

    if (!session) {
      setUser(null)
      setStatus('signed_out')
      return
    }

    setUser(session.user)

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    const verifiedTotp = factorsData?.totp.filter((f) => f.status === 'verified') ?? []

    if (verifiedTotp.length === 0) {
      setStatus('mfa_enroll')
      return
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setStatus(aal?.currentLevel === 'aal2' ? 'ready' : 'mfa_verify')
  }, [])

  useEffect(() => {
    refreshStatus()

    const { data } = supabase.auth.onAuthStateChange(() => {
      // Diferido para no llamar a supabase dentro del callback de onAuthStateChange
      setTimeout(() => {
        refreshStatus()
      }, 0)
    })

    return () => data.subscription.unsubscribe()
  }, [refreshStatus])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStatus('signed_out')
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, refreshStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
