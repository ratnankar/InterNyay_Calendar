import { Holiday } from './types'

type HolidayCourt = 'DISTRICT' | 'HIGH' | 'BOTH'

export function holidayCourtOf(h?: Holiday | null): HolidayCourt {
  const v = String(h?.courtType || '').toUpperCase()
  return v === 'DISTRICT' || v === 'HIGH' ? v : 'BOTH'
}

export function holidayCourtLabel(h?: Holiday | null): string {
  const c = holidayCourtOf(h)
  return c === 'DISTRICT' ? 'District Court' : c === 'HIGH' ? 'High Court' : 'District & High Court'
}
