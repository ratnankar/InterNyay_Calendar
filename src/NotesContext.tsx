import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useAuth } from './AuthContext'
import { DEMO } from './config'
import { isDirty, reconcile, sync, tombstone } from './notesSync'
import { loadNotes, saveNotes } from './storage'
import { Note } from './types'

type Patch = Partial<Pick<Note, 'title' | 'body' | 'ink' | 'pinned' | 'caseId' | 'caseTitle'>>
type SaveStatus = 'saved' | 'saving' | 'error'
// off: nothing to sync (demo), ok: the server has every note, syncing: a round is running, failed: some notes are waiting for internet
type SyncState = 'off' | 'ok' | 'syncing' | 'failed'

export const TITLE_MAX = 120
export const BODY_MAX = 10000

interface NotesState {
  notes: Note[]
  loaded: boolean
  loadFailed: boolean
  status: SaveStatus
  syncState: SyncState
  add: (start?: { caseId?: number; caseTitle?: string }) => string
  update: (id: string, patch: Patch) => void
  remove: (id: string) => void
  reload: () => void
  retrySave: () => void
}

const Ctx = createContext<NotesState | null>(null)

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const token = DEMO ? undefined : session?.token
  const [notes, setNotes] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [syncState, setSyncState] = useState<SyncState>('ok')
  const [attempt, setAttempt] = useState(0)
  const [rev, setRev] = useState(0)
  const syncing = useRef(false)
  const again = useRef<'' | 'edit' | 'full'>('')
  const live = useRef<Note[]>([])
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const user = useRef(userId)
  useEffect(() => { user.current = userId }, [userId])

  const persist = useCallback(async (uid: number | string, list: Note[]) => {
    const ok = await saveNotes(uid, list)
    if (user.current === uid && live.current === list) setStatus(ok ? 'saved' : 'error')
  }, [])

  const flush = useCallback(() => {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = null
    if (userId !== undefined && ready.current) persist(userId, live.current)
  }, [userId, persist])

  useEffect(() => {
    ready.current = false
    live.current = []
    if (userId === undefined) return
    let current = true
    loadNotes(userId).then(result => {
      if (!current) return
      live.current = result.notes
      ready.current = result.ok
      setNotes(result.notes.filter(n => !n.deleted))
      setLoadFailed(!result.ok)
      setLoaded(true)
    })
    return () => {
      current = false
      flush()
      setNotes([])
      setLoaded(false)
      setLoadFailed(false)
      setStatus('saved')
    }
  }, [userId, flush, attempt])

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') flush() })
    return () => sub.remove()
  }, [flush])

  const commit = useCallback((next: Note[]) => {
    if (userId === undefined || !ready.current) return
    live.current = next
    setNotes(next.filter(n => !n.deleted))
    setRev(r => r + 1)
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; persist(userId, live.current) }, 400)
  }, [userId, persist])

  const add = useCallback((start?: { caseId?: number; caseTitle?: string }) => {
    if (!ready.current) return ''
    const now = Date.now()
    const note: Note = { id: newId(), title: '', body: '', caseId: start?.caseId ?? null, caseTitle: start?.caseTitle ?? null, createdAt: now, updatedAt: now }
    commit([note, ...live.current])
    return note.id
  }, [commit])

  const update = useCallback((id: string, patch: Patch) => {
    commit(live.current.map(n => {
      if (n.id !== id || n.deleted) return n
      const next = { ...n, ...patch }
      const changed = (Object.keys(patch) as (keyof Patch)[]).some(k => next[k] !== n[k])
      // Every change (also pinning or linking to a case) gets a newer time, otherwise it is never sent to the server
      return changed ? { ...next, updatedAt: Math.max(Date.now(), n.updatedAt + 1) } : n
    }))
  }, [commit])

  // The note stays as a small deletion marker until the server has it, so the deletion reaches the other phones
  const remove = useCallback((id: string) => commit(live.current.map(n => (n.id === id && !n.deleted ? tombstone(n, Date.now()) : n))), [commit])

  const runSync = useCallback(async (full: boolean) => {
    if (!token || userId === undefined || !ready.current) return
    if (!full && !live.current.some(isDirty)) return
    if (syncing.current) { again.current = full || again.current === 'full' ? 'full' : 'edit'; return }
    syncing.current = true
    setSyncState('syncing')
    try {
      const snapshot = live.current
      const result = await sync(token, snapshot, () => user.current === userId)
      if (user.current === userId) setSyncState(result && !result.failed ? 'ok' : 'failed')
      if (result && user.current === userId) {
        const next = reconcile(live.current, snapshot, result.notes)
        if (JSON.stringify(next) !== JSON.stringify(live.current)) commit(next)
      }
    } finally {
      syncing.current = false
      const rerun = again.current
      again.current = ''
      if (rerun) runSync(rerun === 'full')
    }
  }, [token, userId, commit])

  // Pull and push once the notes are loaded, and again whenever the app comes back to the front
  useEffect(() => { if (loaded && !loadFailed) runSync(true) }, [loaded, loadFailed, runSync])
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'active') runSync(true) })
    return () => sub.remove()
  }, [runSync])

  // A few seconds after the last edit, send what changed
  useEffect(() => {
    if (!token) return
    const t = setTimeout(() => runSync(false), 3000)
    return () => clearTimeout(t)
  }, [rev, token, runSync])

  const reload = useCallback(() => setAttempt(a => a + 1), [])

  const retrySave = useCallback(() => {
    if (userId === undefined || !ready.current) return
    setStatus('saving')
    persist(userId, live.current)
  }, [userId, persist])

  const value = useMemo(
    () => ({ notes, loaded, loadFailed, status, syncState: token ? syncState : 'off' as SyncState, add, update, remove, reload, retrySave }),
    [notes, loaded, loadFailed, status, syncState, token, add, update, remove, reload, retrySave],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotes(): NotesState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNotes outside NotesProvider')
  return v
}
