import { shortDate } from './dates'
import { HearingEntry, HearingLeave, JudgeLeave } from './types'

// "12 Oct" for one day, "12 Oct – 14 Oct" for a span
const spanText = (from: string, to?: string | null): string =>
  `${shortDate(from)}${to && to !== from ? ` – ${shortDate(to)}` : ''}`

export function leaveNotice(leave: HearingLeave): string {
  const range = leave.leaveFrom ? ` (${spanText(leave.leaveFrom, leave.leaveTo)})` : ''
  return `Judge on leave${range}${leave.reason ? `, ${leave.reason}` : ''}`
}

const TITLES = new Set(['hon', 'honble', 'honourable', 'justice', 'judge', 'mr', 'ms', 'mrs', 'dr', 'shri', 'smt', 'sh', 'ld', 'sri'])
// Splitting a name is the costly part of matching and the same few names are compared thousands of times
// (every leave against every hearing, for every day), so each name is split only once
const wordsCache = new Map<string, string[]>()
const words = (name: string): string[] => {
  let w = wordsCache.get(name)
  if (!w) {
    w = name.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(x => x && !TITLES.has(x))
    wordsCache.set(name, w)
  }
  return w
}

function sameJudge(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const x = words(a)
  const y = words(b)
  if (!x.length || !y.length) return false
  if (x.join(' ') === y.join(' ')) return true

  if (x[x.length - 1] !== y[y.length - 1]) return false
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  return short.slice(0, -1).every(w => long.slice(0, -1).some(l => l[0] === w[0]))
}

const normCache = new Map<string, string>()
const norm = (s?: string | null): string => {
  const raw = s || ''
  let n = normCache.get(raw)
  if (n === undefined) {
    n = raw.toLowerCase().replace(/district court|court|complex/g, '').replace(/[^a-z]/g, '')
    normCache.set(raw, n)
  }
  return n
}

export function sameCourt(a?: string | null, b?: string | null): boolean {
  const x = norm(a)
  const y = norm(b)
  return !x || !y || x === y || x.includes(y) || y.includes(x)
}

const covers = (l: JudgeLeave, date: string): boolean => date >= l.leaveFrom && date <= (l.leaveTo || l.leaveFrom)

export const leavesOn = (leaves: JudgeLeave[], date: string): JudgeLeave[] => leaves.filter(l => covers(l, date))

export function leaveForEntry(leaves: JudgeLeave[], e: Pick<HearingEntry, 'date' | 'judgeName' | 'court'>): JudgeLeave | undefined {
  if (!e.judgeName) return undefined
  return leaves.find(l => covers(l, e.date) && sameJudge(l.name, e.judgeName) && sameCourt(l.court, e.court))
}

export const asHearingLeave = (e: HearingEntry, l: JudgeLeave): HearingLeave => ({
  caseId: e.caseId, judgeName: e.judgeName, onLeave: true, leaveFrom: l.leaveFrom, leaveTo: l.leaveTo, reason: l.reason,
})

export const leaveRange = (l: JudgeLeave): string => spanText(l.leaveFrom, l.leaveTo)
