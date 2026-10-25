import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { readBig, writeBig } from './localStore'
import { CourtColours, loadedPrefs, Prefs } from './prefs'
import { Settings } from './settings'
import { Note, User } from './types'

const SESSION = 'internyay_session'
const COLOURS = 'internyay_court_colours'

const web = Platform.OS === 'web'

async function read(key: string): Promise<string | null> {
  try { return web ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key) } catch { return null }
}
async function write(key: string, value: string): Promise<void> {
  try { if (web) window.localStorage.setItem(key, value); else await SecureStore.setItemAsync(key, value) } catch { }
}
async function remove(key: string): Promise<void> {
  try { if (web) window.localStorage.removeItem(key); else await SecureStore.deleteItemAsync(key) } catch { }
}

export interface Session { token: string; user: User }

export async function loadSession(): Promise<Session | null> {
  const raw = await read(SESSION)
  if (!raw) return null
  try {
    const s = JSON.parse(raw)
    return s?.token && s?.user ? s : null
  } catch { return null }
}
export const saveSession = (s: Session) => write(SESSION, JSON.stringify({ ...s, user: { ...s.user, profilePicture: undefined } }))
export const clearSession = () => remove(SESSION)

export async function loadColours(): Promise<CourtColours> {
  const raw = await read(COLOURS)
  if (!raw) return {}
  try { return JSON.parse(raw) || {} } catch { return {} }
}

const COURT_FILTER = 'internyay_court_filter'
export async function loadCourtFilter(): Promise<string[]> {
  const raw = await read(COURT_FILTER)
  if (!raw) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [] } catch { return [] }
}

// Colours, court filter and settings of one account, kept per account on the phone and synced to the server
export async function loadPrefs(userId: number | string): Promise<Prefs | null> {
  return loadedPrefs(await readBig<unknown>(`internyay_prefs_${userId}`))
}
export const savePrefs = (userId: number | string, p: Prefs) => writeBig(`internyay_prefs_${userId}`, p)

const SETTINGS = 'internyay_settings'
export async function loadSettings(): Promise<unknown> {
  const raw = await read(SETTINGS)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}
export const saveSettings = (s: Settings) => write(SETTINGS, JSON.stringify(s))

const NOTE_PIECE = 500
type Slot = 'a' | 'b'
const notesKey = (userId: number | string) => `internyay_notes_${userId}`
let notesWrite: Promise<unknown> = Promise.resolve()
const activeSlot = new Map<string, Slot>()
const lastSaved = new Map<string, string>()

async function readStrict(key: string): Promise<{ ok: boolean; value: string | null }> {
  try { return { ok: true, value: web ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key) } } catch { return { ok: false, value: null } }
}
async function writeStrict(key: string, value: string): Promise<void> {
  if (web) window.localStorage.setItem(key, value); else await SecureStore.setItemAsync(key, value)
}

const isNote = (n: unknown): n is Note => !!n && typeof (n as Note).id === 'string' && typeof (n as Note).updatedAt === 'number'

async function readNoteSet(prefix: string): Promise<Note[] | null | 'error'> {
  const n = await readStrict(`${prefix}_n`)
  if (!n.ok) return 'error'
  if (n.value === null) return null
  const count = parseInt(n.value, 10)
  if (!(count >= 0)) return null
  if (count === 0) return []
  let raw = ''
  for (let i = 0; i < count; i++) {
    const part = await readStrict(`${prefix}_${i}`)
    if (!part.ok) return 'error'
    if (part.value === null) return null
    raw += part.value
  }
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter(isNote) : null
  } catch { return null }
}

export async function loadNotes(userId: number | string): Promise<{ notes: Note[]; ok: boolean }> {
  const base = notesKey(userId)
  const failed = { notes: [] as Note[], ok: false }
  const slot = await readStrict(`${base}_slot`)
  if (!slot.ok) return failed
  const order: Slot[] = slot.value === 'b' ? ['b', 'a'] : slot.value === 'a' ? ['a', 'b'] : []
  for (const sl of order) {
    const set = await readNoteSet(`${base}_${sl}`)
    if (set === 'error') return failed
    if (set) { activeSlot.set(base, sl); lastSaved.set(base, JSON.stringify(set)); return { notes: set, ok: true } }
  }
  if (slot.value === null) {
    const legacy = await readNoteSet(base)
    if (legacy === 'error') return failed
    if (legacy) return { notes: legacy, ok: true }
  }
  activeSlot.delete(base)
  lastSaved.delete(base)
  return { notes: [], ok: true }
}

async function removePieces(prefix: string): Promise<void> {
  const n = await read(`${prefix}_n`)
  const count = parseInt(n || '0', 10) || 0
  for (let i = 0; i < count; i++) await remove(`${prefix}_${i}`)
  if (n !== null) await remove(`${prefix}_n`)
}

export function saveNotes(userId: number | string, notes: Note[]): Promise<boolean> {
  const base = notesKey(userId)
  const json = JSON.stringify(notes)
  const run = notesWrite.then(async () => {
    try {
      if (lastSaved.get(base) === json) return true
      let current = activeSlot.get(base)
      if (!current) {
        const s = await readStrict(`${base}_slot`)
        if (!s.ok) return false
        current = s.value === 'b' ? 'b' : 'a'
        if (s.value === null) activeSlot.delete(base)
      }
      const next: Slot = current === 'a' ? 'b' : 'a'
      const chars = Array.from(json)
      const pieces: string[] = []
      if (notes.length > 0) for (let i = 0; i < chars.length; i += NOTE_PIECE) pieces.push(chars.slice(i, i + NOTE_PIECE).join(''))
      const target = `${base}_${next}`
      for (let i = 0; i < pieces.length; i++) await writeStrict(`${target}_${i}`, pieces[i])
      await writeStrict(`${target}_n`, String(pieces.length))
      await writeStrict(`${base}_slot`, next)
      const old = `${base}_${current}`
      activeSlot.set(base, next)
      lastSaved.set(base, json)
      await removePieces(old)
      await removePieces(base)
      return true
    } catch { return false }
  })
  notesWrite = run
  return run
}
