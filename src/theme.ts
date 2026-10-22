import { createContext, useContext } from 'react'
import { Platform } from 'react-native'

export type Scheme = 'light' | 'dark'

const light = {
  bg: '#F8FAFD',
  card: '#FFFFFF',
  ink: '#202124',
  muted: '#5F6368',
  faint: '#80868B',
  line: '#DADCE0',
  inputLine: '#DADCE0',
  brand: '#1F4FA0',
  brandSoft: '#F1F3F4',
  hover: '#F1F3F4',
  hoverSoft: '#F6F7F8',
  hoverStrong: '#E8EAED',
  hoverTint: 'rgba(60, 64, 67, 0.08)',
  gold: '#C9A84C',
  goldBtn: '#D8B856',
  goldDark: '#8A6D1A',
  goldSoft: '#FDF6E3',
  danger: '#A32D2D',
  dangerSoft: '#FBEAEA',
  dangerLine: '#E9B8B8',
  dangerHover: '#F6DADA',
  sunday: '#B45309',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255, 255, 255, 0.74)',
  onBrandFill: '#FFFFFF',
  onDanger: '#FFFFFF',
  blueSoft: '#E7EDF8',
  navy: '#0A1628',
  scrim: 'rgba(10, 22, 40, 0.5)',
  scrimSoft: 'rgba(32, 33, 36, 0.12)',
  skeleton: '#E8EAED',
  focus: '#1F4FA0',
  tagBg: 'rgba(128, 128, 128, 0.25)',
  display: 'display',
  mono: 'mono',
}

const dark: typeof light = {
  bg: '#121316',
  card: '#1B1D21',
  ink: '#E8EAED',
  muted: '#A9AEB5',
  faint: '#8A9099',
  line: '#33373D',
  inputLine: '#454A51',
  brand: '#7BA4F0',
  brandSoft: '#262A30',
  hover: '#262A30',
  hoverSoft: '#21242A',
  hoverStrong: '#31353C',
  hoverTint: 'rgba(255, 255, 255, 0.08)',
  gold: '#C9A84C',
  goldBtn: '#D8B856',
  goldDark: '#E6CD7A',
  goldSoft: '#2B2616',
  danger: '#F28B82',
  dangerSoft: '#3A2224',
  dangerLine: '#5C3338',
  dangerHover: '#4A2B2E',
  sunday: '#F5A25D',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255, 255, 255, 0.74)',
  onBrandFill: '#0A1628',
  onDanger: '#2B0B0B',
  blueSoft: '#27344F',
  navy: '#0A1628',
  scrim: 'rgba(0, 0, 0, 0.62)',
  scrimSoft: 'rgba(0, 0, 0, 0.35)',
  skeleton: '#2A2D33',
  focus: '#7BA4F0',
  tagBg: 'rgba(128, 128, 128, 0.32)',
  display: 'display',
  mono: 'mono',
}

export const theme: typeof light = { ...light }
export const palettes: Record<Scheme, typeof light> = { light, dark }
export const applyScheme = (scheme: Scheme): void => { Object.assign(theme, palettes[scheme]) }

export const ThemeContext = createContext<Scheme>('light')
export const useScheme = (): Scheme => useContext(ThemeContext)

export function makeStyles<T>(factory: () => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {}
  return () => {
    const scheme = useScheme()
    return cache[scheme] ?? (cache[scheme] = factory())
  }
}

export const font = {
  micro: { fontSize: 11, lineHeight: 15, letterSpacing: 0.2 },
  weekday: { fontSize: 11, lineHeight: 24 },
  microWide: { fontSize: 11, lineHeight: 15, letterSpacing: 0.8 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  captionLong: { fontSize: 12, lineHeight: 18 },
  small: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 15, lineHeight: 20 },
  text: { fontSize: 15, lineHeight: 22 },
  title: { fontSize: 16, lineHeight: 22 },
  entry: { fontSize: 16, lineHeight: 24 },
  sheetTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  appBar: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  eventTitle: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  hero: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  digits: ['tabular-nums'] as ['tabular-nums'],
} as const

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 }

export const cardShadow = Platform.select({
  ios: { shadowColor: '#0A1628', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 1 },
  default: { boxShadow: '0 1px 2px rgba(10,22,40,0.06), 0 6px 16px -8px rgba(10,22,40,0.14)' },
}) as object

export const liftShadow = Platform.select({
  ios: { shadowColor: '#0A1628', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 4 },
  default: { boxShadow: '0 2px 4px rgba(10,22,40,0.10), 0 14px 28px -12px rgba(10,22,40,0.38)' },
}) as object

// Court colours. The first twelve are the original defaults (a court without a chosen colour takes them in order),
// the rest are extra choices; the picker shows them PALETTE_COLUMNS to a row
export const PALETTE_COLUMNS = 6
export const PALETTE = [
  '#039BE5', '#2FA56F', '#8E24AA', '#E0675C', '#F4511E', '#3F51B5',
  '#0B8043', '#D50000', '#7986CB', '#616161', '#EF6C00', '#00897B',
  '#E91E63', '#F6BF26', '#795548', '#C0CA33', '#00ACC1', '#1A237E',
  '#546E7A', '#7CB342', '#BA68C8', '#4DD0E1', '#FF8A65', '#4E342E',
]

export const defaultColour = (index: number) => PALETTE[index % PALETTE.length]

export function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const HOLIDAY_COLOURS = {
  DISTRICT: { solid: '#2E7D32', soft: 'rgba(46, 125, 50, 0.14)', border: 'rgba(46, 125, 50, 0.35)' },
  HIGH:     { solid: '#C62828', soft: 'rgba(198, 40, 40, 0.12)', border: 'rgba(198, 40, 40, 0.33)' },
}

const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
function luminance(hex: string): number {
  const v = hex.replace('#', '')
  return 0.2126 * channel(parseInt(v.slice(0, 2), 16)) + 0.7152 * channel(parseInt(v.slice(2, 4), 16)) + 0.0722 * channel(parseInt(v.slice(4, 6), 16))
}
const DARK_INK = '#1F2328'
const readableCache = new Map<string, { ink: string; sub: string }>()

export function readable(hex: string): { ink: string; sub: string } {
  const hit = readableCache.get(hex)
  if (hit) return hit
  const l = (/^#[0-9a-f]{6}$/i.test(hex) ? luminance(hex) : 0)
  const dark = (l + 0.05) / 0.0666 > 1.05 / (l + 0.05)
  const out = dark ? { ink: DARK_INK, sub: 'rgba(31, 35, 40, 0.78)' } : { ink: '#FFFFFF', sub: 'rgba(255, 255, 255, 0.9)' }
  readableCache.set(hex, out)
  return out
}
