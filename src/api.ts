import { API_BASE_URL, DEMO } from './config'
import * as demo from './demo'
import { CaseItem, Note, CourtRow, HearingLeave, JudgeLeave, HearingRow, Holiday, LoginResponse, MiscApplication, Page, User } from './types'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Safe reads from a caught value (anything can be thrown): the message to show and the HTTP status, if it is an ApiError
export const errorMessage = (e: unknown, fallback: string): string => (e instanceof Error && e.message) || fallback
export const errorStatus = (e: unknown): number | undefined => (e instanceof ApiError ? e.status : undefined)

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn }

// A request that gets no answer at all (a weak connection that never drops) must not leave a spinner running for ever
const REQUEST_TIMEOUT_MS = 30_000

const UNREACHABLE = 'Cannot reach InterNyay. Check your internet connection and try again.'

async function send<T>(path: string, init: RequestInit, token?: string | null): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res: Response
  let text: string
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-Client-App': 'calendar',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    // The timer also covers reading the body, so a server that stops halfway is cut off too
    text = await res.text()
  } catch {
    throw new ApiError(UNREACHABLE, 0)
  } finally {
    clearTimeout(timer)
  }

  let data: { message?: unknown; error?: unknown } | null = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }

  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized()
    const msg = (data && (data.message || data.error)) || (res.status === 401 ? 'Your session has ended. Please sign in again.' : `Something went wrong (${res.status})`)
    throw new ApiError(String(msg), res.status)
  }
  return data as T
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
  return q ? `?${q}` : ''
}

const get = <T,>(path: string, token: string, params?: Record<string, string | number | undefined>): Promise<T> =>
  send<T>(path + qs(params), { method: 'GET' }, token)

export function login(email: string, password: string, accountType?: 'ADVOCATE' | 'ASSOCIATE'): Promise<LoginResponse> {
  return send<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password, accountType }) })
}

export function googleLogin(idToken: string, accountType?: 'ADVOCATE' | 'ASSOCIATE'): Promise<LoginResponse> {
  return send<LoginResponse>('/auth/google/login', { method: 'POST', body: JSON.stringify({ idToken, accountType }) })
}

async function allPages<T>(path: string, token: string, params: Record<string, string | number | undefined>): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < 100; page++) {
    const res = await get<Page<T>>(path, token, { ...params, page, size: 200 })
    const rows = res?.content
    if (!Array.isArray(rows) || rows.length === 0) break
    out.push(...rows)
    if (res.last) break
  }
  return out
}

export const fetchCases = (token: string) => DEMO ? Promise.resolve(demo.cases()) : allPages<CaseItem>('/cases', token, {})

export const fetchHearings = (token: string, from: string, to: string) =>
  DEMO ? Promise.resolve(demo.hearings()) : allPages<HearingRow>('/hearings', token, { from, to })

export const fetchMiscApplications = (token: string) =>
  DEMO ? Promise.resolve(demo.miscApplications()) : allPages<MiscApplication>('/misc-applications', token, {})

export const fetchMe = (token: string) => DEMO ? Promise.resolve(demo.user) : get<User>('/auth/me', token)

export const fetchCourts = (token: string) => DEMO ? Promise.resolve(demo.courts()) : get<CourtRow[]>('/courts', token)

export const fetchHolidays = (token: string) => DEMO ? Promise.resolve(demo.holidays()) : get<Holiday[]>('/holidays', token)

export const fetchNoHearingDates = (token: string) => DEMO ? Promise.resolve(demo.noHearing()) : get<string[]>('/no-hearing-dates', token)

export async function fetchJudgeLeaves(token: string): Promise<JudgeLeave[]> {
  if (DEMO) return demo.judgeLeaves()
  const r = await get<{ onLeaveToday?: JudgeLeave[]; upcoming?: JudgeLeave[]; past?: JudgeLeave[] }>('/quick-access/judges-on-leave', token)
  const seen = new Set<string>()
  return [...(r?.onLeaveToday || []), ...(r?.upcoming || []), ...(r?.past || [])].filter(l => {
    const k = `${l.name}|${l.court}|${l.leaveFrom}|${l.leaveTo}`
    if (!l.name || !l.leaveFrom || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export const fetchHearingLeave = (token: string, date: string) =>
  DEMO ? Promise.resolve(demo.leave(date)) : get<HearingLeave[]>('/cases/hearing-leave', token, { date })

// Notes are private to the signed-in account and stored on the InterNyay server so they survive a new phone.
// The server answers with the stored note; a deleted one comes back with deleted = true
export interface ServerNote {
  id: string
  title: string
  body: string
  ink?: string | null
  pinned?: boolean
  caseId?: number | null
  caseTitle?: string | null
  createdAt: number
  updatedAt: number
  deleted?: boolean
}

export const fetchNotes = async (token: string): Promise<ServerNote[]> =>
  (await get<{ notes?: ServerNote[] }>('/notes', token))?.notes || []

export const saveNoteOnServer = (token: string, n: Note): Promise<ServerNote> =>
  send<ServerNote>(`/notes/${encodeURIComponent(n.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: n.title, body: n.body, ink: n.ink || null, pinned: !!n.pinned,
      caseId: n.caseId ?? null, caseTitle: n.caseTitle ?? null, createdAt: n.createdAt, updatedAt: n.updatedAt,
    }),
  }, token)

export const deleteNoteOnServer = (token: string, id: string, at: number): Promise<ServerNote> =>
  send<ServerNote>(`/notes/${encodeURIComponent(id)}?at=${at}`, { method: 'DELETE' }, token)

// Colours, court filter and settings of the account. data is null and updatedAt 0 until something was saved
interface ServerPrefs { data: unknown; updatedAt: number }

export const fetchPrefs = (token: string): Promise<ServerPrefs> => get<ServerPrefs>('/app-preferences', token)

export const savePrefsOnServer = (token: string, data: unknown, updatedAt: number): Promise<ServerPrefs> =>
  send<ServerPrefs>('/app-preferences', { method: 'PUT', body: JSON.stringify({ data, updatedAt }) }, token)
