import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import * as api from './api'
import { useAuth } from './AuthContext'
import { DEMO } from './config'
import { configureDates } from './dates'
import { CourtColours, DEFAULT_PREFS, normalizePrefs, Prefs, toData } from './prefs'
import { DEFAULT_SETTINGS, normalizeSettings, Settings } from './settings'
import { loadColours, loadCourtFilter, loadPrefs, loadSettings, savePrefs, saveSettings } from './storage'

interface SettingsState {
  settings: Settings
  loaded: boolean
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

interface PrefsState {
  colours: CourtColours
  courtFilter: string[]
  loaded: boolean
  setColour: (court: string, colour: string) => void
  setCourtFilter: (courts: string[]) => void
}

const Ctx = createContext<(SettingsState & PrefsState) | null>(null)

// Phones that used the app before preferences were kept per account still have them in the old places
async function legacyPrefs(): Promise<Prefs> {
  const [settings, colours, courtFilter] = await Promise.all([loadSettings(), loadColours(), loadCourtFilter()])
  const any = settings !== null || Object.keys(colours).length > 0 || courtFilter.length > 0
  // 1 (not "now"): a copy the account already has on the server is newer and wins; if the server has none, this is sent
  return { colours, courtFilter, settings: normalizeSettings(settings), updatedAt: any ? 1 : 0 }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// The colour of every court, the court filter and the view settings. They are kept on the phone (per account) and on
// the InterNyay server, so they follow the account to a new phone. The newest change wins.
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const token = DEMO ? undefined : session?.token
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const current = useRef(prefs)
  const ready = useRef(false)
  const user = useRef(userId)
  const tokenRef = useRef(token)
  useEffect(() => {
    user.current = userId
    tokenRef.current = token
  }, [userId, token])
  const syncing = useRef(false)
  const again = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const apply = useCallback((next: Prefs) => {
    current.current = next
    configureDates(next.settings)
    setPrefs(next)
  }, [])

  // Open this account's preferences from the phone (signed out: only the view settings of the device)
  useEffect(() => {
    ready.current = false
    let live = true
    ;(async () => {
      let p: Prefs
      if (userId === undefined) {
        p = { ...DEFAULT_PREFS, settings: normalizeSettings(await loadSettings()) }
      } else {
        const own = await loadPrefs(userId)
        p = own ?? await legacyPrefs()
        if (!own) savePrefs(userId, p)
      }
      if (!live) return
      apply(p)
      ready.current = true
      setLoaded(true)
    })()
    return () => { live = false; setLoaded(false) }
  }, [userId, apply])

  // Bring the phone and the server to the same copy: the newer one wins. A failure (no internet) is tried again later
  const sync = useCallback(async () => {
    const round = async (tok: string, uid: number | string) => {
      const server = await api.fetchPrefs(tok)
      if (user.current !== uid) return
      const mine = current.current
      if (server.updatedAt > mine.updatedAt) {
        const next = normalizePrefs(server.data, server.updatedAt)
        apply(next)
        saveSettings(next.settings)
        savePrefs(uid, next)
      } else if (mine.updatedAt > server.updatedAt) {
        const stored = await api.savePrefsOnServer(tok, toData(mine), mine.updatedAt)
        // Changed on the phone while sending: that newer change is sent in the next round
        if (user.current !== uid || current.current.updatedAt !== mine.updatedAt) { again.current = true; return }
        if (stored.updatedAt > mine.updatedAt) {
          // Another phone saved later than this one
          const next = normalizePrefs(stored.data, stored.updatedAt)
          apply(next)
          saveSettings(next.settings)
          savePrefs(uid, next)
        }
      }
    }
    for (;;) {
      const tok = tokenRef.current
      const uid = user.current
      if (!tok || uid === undefined || !ready.current) return
      if (syncing.current) { again.current = true; return }
      syncing.current = true
      try {
        await round(tok, uid)
      } catch { } finally {
        syncing.current = false
      }
      if (!again.current) return
      again.current = false
    }
  }, [apply])

  useEffect(() => { if (loaded && token) sync() }, [loaded, token, sync])
  useEffect(() => {
    const sub = AppState.addEventListener('change', () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      sync()
    })
    return () => sub.remove()
  }, [sync])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const commit = useCallback((patch: Partial<Omit<Prefs, 'updatedAt'>>) => {
    if (!ready.current) return
    const was = current.current
    const next: Prefs = { ...was, ...patch, updatedAt: Math.max(Date.now(), was.updatedAt + 1) }
    if (same(toData(next), toData(was))) return
    apply(next)
    if (patch.settings) saveSettings(next.settings)
    if (user.current !== undefined) savePrefs(user.current, next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; sync() }, 1500)
  }, [apply, sync])

  const update = useCallback((patch: Partial<Settings>) => commit({ settings: { ...current.current.settings, ...patch } }), [commit])
  const reset = useCallback(() => commit({ settings: DEFAULT_SETTINGS }), [commit])
  const setColour = useCallback((court: string, colour: string) => commit({ colours: { ...current.current.colours, [court]: colour } }), [commit])
  const setCourtFilter = useCallback((courts: string[]) => commit({ courtFilter: courts }), [commit])

  const value = useMemo(
    () => ({ settings: prefs.settings, colours: prefs.colours, courtFilter: prefs.courtFilter, loaded, update, reset, setColour, setCourtFilter }),
    [prefs, loaded, update, reset, setColour, setCourtFilter],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings outside SettingsProvider')
  return v
}

export function usePrefs(): PrefsState {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePrefs outside SettingsProvider')
  return v
}
