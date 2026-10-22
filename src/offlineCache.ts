import { readBig, removeBig, writeBig } from './localStore'
import { CaseItem, CourtRow, HearingRow, Holiday, JudgeLeave, MiscApplication } from './types'

// The last hearings the server sent, kept on the phone so the calendar opens without internet.
// One copy per account. It is replaced after every successful load and removed when the user signs out.

export interface HearingSnapshot {
  savedAt: number
  cases: CaseItem[]
  rows: HearingRow[]
  apps: MiscApplication[]
  holidays: Holiday[]
  noHearing: string[]
  courts: CourtRow[]
  judgeLeaves: JudgeLeave[]
}

const key = (userId: number | string) => `internyay_hearings_${userId}`

export async function loadHearingCache(userId: number | string): Promise<HearingSnapshot | null> {
  const s = await readBig<HearingSnapshot>(key(userId))
  return s && Array.isArray(s.cases) && Array.isArray(s.rows) && typeof s.savedAt === 'number' ? s : null
}

export const saveHearingCache = (userId: number | string, s: HearingSnapshot) => writeBig(key(userId), s)

export const clearHearingCache = (userId: number | string) => removeBig(key(userId))
