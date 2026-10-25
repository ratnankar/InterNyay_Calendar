import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api'
import { DEMO } from './config'
import { user as demoUser } from './demo'
import { googleIdToken, googleSignOut } from './googleAuth'
import { clearHearingCache } from './offlineCache'
import { clearSession, loadSession, saveSession, Session } from './storage'

interface AuthState {
  session: Session | null
  loading: boolean
  notice: string
  signIn: (email: string, password: string, accountType?: 'ADVOCATE' | 'ASSOCIATE') => Promise<void>
  signInWithGoogle: (accountType?: 'ADVOCATE' | 'ASSOCIATE') => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => (DEMO ? { token: 'demo', user: demoUser } : null))
  const [loading, setLoading] = useState(!DEMO)
  const [notice, setNotice] = useState('')

  const current = useRef<Session | null>(session)
  useEffect(() => { current.current = session }, [session])

  const signOut = useCallback(async () => {
    const uid = current.current?.user.id
    // Marked at once (the state only changes on the next render), so a 401 that arrives right now sees "signed out"
    current.current = null
    setSession(null)
    await clearSession()
    // The hearings saved for offline use must not stay on the phone after signing out
    if (uid !== undefined) clearHearingCache(uid)
    googleSignOut()
  }, [])

  useEffect(() => {
    if (DEMO) return
    loadSession().then(s => { setSession(s); setLoading(false) })
  }, [])

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      // Several requests fail together when the session ends; only the first one signs out, and a late answer
      // that arrives after the user signed out by hand must not put a notice on the sign-in screen
      if (!current.current) return
      setNotice('Your session has ended. Please sign in again.')
      signOut()
    })
    return () => api.setUnauthorizedHandler(null)
  }, [signOut])

  const signIn = useCallback(async (email: string, password: string, accountType?: 'ADVOCATE' | 'ASSOCIATE') => {
    const res = await api.login(email, password, accountType)
    const s = { token: res.token, user: res.user }
    await saveSession(s)
    setNotice('')
    setSession(s)
  }, [])

  const signInWithGoogle = useCallback(async (accountType?: 'ADVOCATE' | 'ASSOCIATE') => {
    const idToken = await googleIdToken()
    const res = await api.googleLogin(idToken, accountType)
    const s = { token: res.token, user: res.user }
    await saveSession(s)
    setNotice('')
    setSession(s)
  }, [])

  const value = useMemo(() => ({ session, loading, notice, signIn, signInWithGoogle, signOut }), [session, loading, notice, signIn, signInWithGoogle, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
