export interface Settings {
  weekStart: 0 | 1
  showHolidays: boolean
  showNoHearing: boolean
  appearance: 'system' | 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 0,
  showHolidays: true,
  showNoHearing: true,
  appearance: 'system',
}

export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_SETTINGS
  return {
    weekStart: r.weekStart === 1 ? 1 : 0,
    showHolidays: typeof r.showHolidays === 'boolean' ? r.showHolidays : d.showHolidays,
    showNoHearing: typeof r.showNoHearing === 'boolean' ? r.showNoHearing : d.showNoHearing,
    appearance: r.appearance === 'light' || r.appearance === 'dark' ? r.appearance : 'system',
  }
}
