import { fetchHearingLeave } from './api'
import { HearingEntry, HearingLeave } from './types'

const known = new Map<string, number>()
const asked = new Set<string>()

export const listNoOf = (caseId: number, date: string): number | undefined => known.get(`${caseId}|${date}`)

export const itemOf = (e: Pick<HearingEntry, 'kind' | 'caseId' | 'date'>): number | undefined => (e.kind === 'misc' ? undefined : listNoOf(e.caseId, e.date))

export function itemLabel(e: Pick<HearingEntry, 'kind' | 'caseId' | 'date' | 'caseTitle'>): string {
  const n = itemOf(e)
  return n ? `${e.caseTitle} (Item ${n})` : e.caseTitle
}

export function rememberListNos(date: string, rows: HearingLeave[]) {
  asked.add(date)
  for (const r of rows) if (r.causeListNo) known.set(`${r.caseId}|${date}`, r.causeListNo)
}

export const clearListNos = () => { known.clear(); asked.clear() }

export async function loadListNos(token: string, dates: string[]): Promise<boolean> {
  const todo = dates.filter(d => !asked.has(d))
  if (!todo.length) return false
  const done = await Promise.all(todo.map(d => fetchHearingLeave(token, d).then(rows => { rememberListNos(d, rows); return true }).catch(() => false)))
  return done.some(Boolean)
}
