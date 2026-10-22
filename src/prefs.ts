import { DEFAULT_SETTINGS, normalizeSettings, Settings } from './settings'

// Everything the user sets in the app that should follow the account to a new phone.
// updatedAt is when it last changed (epoch milliseconds); the newest copy, phone or server, wins.

export type CourtColours = Record<string, string>

export interface Prefs {
  colours: CourtColours
  courtFilter: string[]
  settings: Settings
  updatedAt: number
}

export const DEFAULT_PREFS: Prefs = { colours: {}, courtFilter: [], settings: DEFAULT_SETTINGS, updatedAt: 0 }

// What is sent to the server (the timestamp travels beside it)
export interface PrefsData { colours: CourtColours; courtFilter: string[]; settings: Settings }

export const toData = (p: Prefs): PrefsData => ({ colours: p.colours, courtFilter: p.courtFilter, settings: p.settings })

export function normalizeData(raw: unknown): PrefsData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const colours: CourtColours = {}
  if (r.colours && typeof r.colours === 'object' && !Array.isArray(r.colours)) {
    for (const [court, colour] of Object.entries(r.colours as Record<string, unknown>)) {
      if (typeof colour === 'string' && colour.length <= 32) colours[court] = colour
    }
  }
  const courtFilter = Array.isArray(r.courtFilter) ? r.courtFilter.filter((x): x is string => typeof x === 'string').slice(0, 200) : []
  return { colours, courtFilter, settings: normalizeSettings(r.settings) }
}

export const normalizePrefs = (raw: unknown, updatedAt: number): Prefs => ({ ...normalizeData(raw), updatedAt })

export function loadedPrefs(raw: unknown): Prefs | null {
  const r = raw as Partial<Prefs> | null
  return r && typeof r === 'object' && typeof r.updatedAt === 'number' ? normalizePrefs(r, r.updatedAt) : null
}
