import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { fetchCases, fetchCourts, fetchHearings, fetchHolidays, fetchJudgeLeaves, fetchMiscApplications, fetchNoHearingDates, errorMessage, errorStatus } from './api'
import { DEMO } from './config'
import { addDays, dateKey, shortDate, todayKey } from './dates'
import { buildEntries, courtsOf, groupByDate } from './hearings'
import { HearingSnapshot, loadHearingCache, saveHearingCache } from './offlineCache'
import { HearingEntry, Holiday, JudgeLeave, MiscApplication } from './types'

// Hearings are refreshed quietly when the app comes back to the front, at most this often
const FOREGROUND_REFRESH_MS = 3 * 60 * 1000

const savedLabel = (ts: number) => {
  const d = new Date(ts)
  return `${shortDate(dateKey(d))}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

export function useHearingData(token: string, userId?: number | string) {
  const [entries, setEntries] = useState<HearingEntry[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [noHearing, setNoHearing] = useState<Set<string>>(new Set())
  const [judgeLeaves, setJudgeLeaves] = useState<JudgeLeave[]>([])
  const [courtNames, setCourtNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // The last hearings saved on the phone (read once, then kept up to date after every successful load)
  const saved = useRef<HearingSnapshot | null>(null)
  const savedRead = useRef(false)
  // The load that is running now, so two never run at once, and when the last successful one finished
  const inFlight = useRef<Promise<void> | null>(null)
  const lastLoaded = useRef(0)

  const show = useCallback((s: HearingSnapshot, today: string) => {
    setJudgeLeaves(s.judgeLeaves)
    setHolidays(s.holidays)
    setNoHearing(new Set(s.noHearing))
    setCourtNames([...new Set(s.courts.map(r => (r.court || '').trim()).filter(Boolean))])
    setEntries(buildEntries(s.cases, s.rows, today, s.apps))
  }, [])

  // silent: a background refresh. No spinner, and a failure leaves what is on screen as it is
  const run = useCallback(async (pull: boolean, silent: boolean) => {
    if (!silent) {
      pull ? setRefreshing(true) : setLoading(true)
      setError('')
      setNotice('')
    }
    const today = todayKey()
    const keep = !DEMO && userId !== undefined
    try {
      if (keep && !savedRead.current) {
        saved.current = await loadHearingCache(userId)
        savedRead.current = true
        // Show what the phone has at once; the fresh copy replaces it when it arrives
        if (saved.current && !pull) { show(saved.current, today); setLoading(false) }
      }
      const old = saved.current
      let miscProblem = false
      // A part that could not be loaded (null) keeps its saved copy instead of becoming empty
      const [cases, rows, hol, noH, table, jl, apps] = await Promise.all([
        fetchCases(token),
        fetchHearings(token, addDays(today, -400), addDays(today, 800)),
        fetchHolidays(token).catch(() => null),
        fetchNoHearingDates(token).catch(() => null),
        fetchCourts(token).catch(() => null),
        fetchJudgeLeaves(token).catch(() => null),
        fetchMiscApplications(token).catch((e: unknown) => {
          const status = errorStatus(e)
          if (status === 403 || status === 404) return [] as MiscApplication[]
          miscProblem = true
          return null
        }),
      ])
      const fresh: HearingSnapshot = {
        savedAt: Date.now(),
        cases, rows,
        apps: Array.isArray(apps) ? apps : old?.apps || [],
        holidays: Array.isArray(hol) ? hol : old?.holidays || [],
        noHearing: Array.isArray(noH) ? noH : old?.noHearing || [],
        courts: Array.isArray(table) ? table : old?.courts || [],
        judgeLeaves: Array.isArray(jl) ? jl : old?.judgeLeaves || [],
      }
      if (miscProblem) setNotice('Miscellaneous applications could not be loaded, so they are missing from the calendar.')
      show(fresh, today)
      if (keep) { saved.current = fresh; saveHearingCache(userId, fresh) }
      lastLoaded.current = Date.now()
    } catch (e) {
      const old = saved.current
      if (silent) {
        // Keep showing what is already on screen; the next refresh will try again
      } else if (old) {
        // No internet or the server did not answer: keep working with the last copy
        show(old, today)
        setNotice(`${errorStatus(e) === 0 ? 'You are offline' : 'Could not refresh'}. Showing the hearings saved on this phone on ${savedLabel(old.savedAt)}.`)
      } else {
        setError(errorMessage(e, 'Could not load hearings'))
      }
    } finally {
      if (!silent) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [token, userId, show])

  const load = useCallback((pull = false, silent = false): Promise<void> => {
    if (inFlight.current) {
      // Someone pulled to refresh while a load is already running: show the spinner until that one is done
      if (pull && !silent) {
        setRefreshing(true)
        inFlight.current.finally(() => setRefreshing(false))
      }
      return inFlight.current
    }
    const p = run(pull, silent).finally(() => { inFlight.current = null })
    inFlight.current = p
    return p
  }, [run])

  useEffect(() => { load() }, [load])

  // Coming back to the app (or the browser tab) refreshes the hearings quietly if the copy is a few minutes old
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && Date.now() - lastLoaded.current > FOREGROUND_REFRESH_MS) load(false, true)
    })
    return () => sub.remove()
  }, [load])

  const byDate = useMemo(() => groupByDate(entries), [entries])
  const holidayByDate = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays])
  const courts = useMemo(() => {
    const used = courtsOf(entries)
    return [...used, ...courtNames.filter(c => !used.includes(c))]
  }, [entries, courtNames])

  return { entries, byDate, judgeLeaves, courts, holidayByDate, noHearing, loading, refreshing, error, notice, reload: () => load(true) }
}
