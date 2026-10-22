import * as api from './api'
import { Note } from './types'

// Keeps the notes on the phone and on the InterNyay server the same. The phone stays the working copy
// (notes open and save at once, also offline); the server copy lets them follow the user to a new phone.
// The newest edit (updatedAt) wins. A deleted note stays as a small marker (deleted: true) until the server has it.

export const tombstone = (n: Note, at: number): Note => ({ id: n.id, title: '', body: '', caseId: null, caseTitle: null, createdAt: n.createdAt, updatedAt: at, deleted: true, synced: n.synced })

const fromServer = (s: api.ServerNote): Note => s.deleted
  ? { id: s.id, title: '', body: '', caseId: null, caseTitle: null, createdAt: s.createdAt, updatedAt: s.updatedAt, deleted: true, synced: s.updatedAt }
  : {
      id: s.id, title: s.title || '', body: s.body || '', ink: s.ink || undefined, pinned: !!s.pinned,
      caseId: s.caseId ?? null, caseTitle: s.caseTitle ?? null, createdAt: s.createdAt, updatedAt: s.updatedAt, synced: s.updatedAt,
    }

// A note that still has to be sent. An empty note is not sent (the app drops it)
export const isDirty = (n: Note) => n.synced !== n.updatedAt && !!(n.deleted || n.title || n.body || n.ink)

// Combine what the phone has with what the server has. The result is the new local list
export function merge(local: Note[], server: api.ServerNote[]): Note[] {
  const out = new Map(local.map(n => [n.id, n]))
  for (const s of server) {
    const mine = out.get(s.id)
    if (!mine || s.updatedAt > mine.updatedAt) out.set(s.id, fromServer(s))
    else if (s.updatedAt === mine.updatedAt) out.set(s.id, { ...mine, synced: s.updatedAt })
    // else: the phone has the newer edit, it is sent next
  }
  // A deletion the server has already seen is not needed on the phone any more
  return [...out.values()].filter(n => !(n.deleted && n.synced === n.updatedAt))
}

// Apply the result of a sync round to the list as it is now. A note the user touched while the round was running
// is kept as it is (it is sent in the next round); the others take the synced version
export function reconcile(current: Note[], snapshot: Note[], result: Note[]): Note[] {
  const snap = new Map(snapshot.map(n => [n.id, n]))
  const res = new Map(result.map(n => [n.id, n]))
  const have = new Set(current.map(n => n.id))
  const out: Note[] = []
  for (const n of current) {
    const was = snap.get(n.id)
    if (was && was.updatedAt === n.updatedAt && was.synced === n.synced) {
      const r = res.get(n.id)
      if (r) out.push(r)
    } else out.push(n)
  }
  for (const r of result) if (!snap.has(r.id) && !have.has(r.id)) out.push(r)
  return out
}

export interface PushResult { notes: Note[]; failed: boolean }

// Send every changed note and every deletion. The server answers with what it stores; if that is newer
// (another phone edited it later), the phone takes the server's copy
export async function push(token: string, list: Note[], isCurrent: () => boolean): Promise<PushResult> {
  let notes = list
  let failed = false
  for (const n of list) {
    if (!isDirty(n)) continue
    if (!isCurrent()) return { notes, failed: true }
    try {
      const stored = n.deleted ? await api.deleteNoteOnServer(token, n.id, n.updatedAt) : await api.saveNoteOnServer(token, n)
      const next = stored.updatedAt > n.updatedAt ? fromServer(stored) : { ...n, synced: n.updatedAt }
      notes = notes.map(x => (x.id === n.id ? next : x))
    } catch (e: any) {
      failed = true
      // A refusal of this one note (too large, limit reached) must not block the others; a network error ends the round
      if (!(e && typeof e.status === 'number' && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 409 && e.status !== 429)) break
    }
  }
  return { notes: notes.filter(n => !(n.deleted && n.synced === n.updatedAt)), failed }
}

export async function sync(token: string, local: Note[], isCurrent: () => boolean): Promise<PushResult | null> {
  let server: api.ServerNote[]
  try { server = await api.fetchNotes(token) } catch { return null }
  if (!isCurrent()) return null
  return push(token, merge(local, server), isCurrent)
}
