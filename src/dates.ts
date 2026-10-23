export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = (): string => dateKey(new Date())

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

let weekStart: 0 | 1 = 0
export function configureDates(o: { weekStart: 0 | 1 }) {
  weekStart = o.weekStart
}

export const weekdayLetters = (): string[] => [...WEEKDAY_LETTERS.slice(weekStart), ...WEEKDAY_LETTERS.slice(0, weekStart)]

export const weekdayNames = (): string[] => [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)]

export const sundayColumn = (): number => (7 - weekStart) % 7

export const monthOffset = (year: number, month: number): number => (new Date(year, month, 1).getDay() - weekStart + 7) % 7

export function longDate(key: string): string {
  const d = parseKey(key)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function fullDate(key: string): string {
  const d = parseKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function shortDate(key: string): string {
  const d = parseKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

function daysFromToday(key: string): number {
  const a = parseKey(todayKey()).getTime()
  const b = parseKey(key).getTime()
  return Math.round((b - a) / 86400000)
}

export function relativeLabel(key: string): string {
  const n = daysFromToday(key)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1 && n < 15) return `In ${n} days`
  return ''
}

export function addMonths(key: string, n: number): string {
  const d = parseKey(key)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return dateKey(d)
}

export function stepYear(key: string, n: number): string {
  const year = parseKey(key).getFullYear() + n
  const now = new Date()
  if (year === now.getFullYear()) return todayKey()
  return dateKey(new Date(year, n > 0 ? 0 : 11, 1))
}

export function dayLabel(key: string): string {
  const d = parseKey(key)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

// The same day-of-month in another month, held to that month's length (31 Jan -> 28 Feb)
export function inMonth(key: string, year: number, month: number): string {
  const last = new Date(year, month + 1, 0).getDate()
  return dateKey(new Date(year, month, Math.min(parseKey(key).getDate(), last)))
}
