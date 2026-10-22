export const INK_W = 1000
export const INK_H = 800
export const INK_MAX = 60000
export const INK_WIDTH = 4
export const ERASER_PX = 14
export const RULE_GAP = 50

const MIN_STEP = 3

export interface Stroke { c: number; p: number[] }

export const parseInk = (raw?: string | null): Stroke[] => {
  if (!raw) return []
  const out: Stroke[] = []
  for (const part of raw.split('|')) {
    const cut = part.indexOf(':')
    if (cut < 1) continue
    const c = parseInt(part.slice(0, cut), 10)
    const tokens = part.slice(cut + 1).split(' ')
    const p: number[] = []
    let ok = c >= 0
    for (let i = 0; i < tokens.length && ok; i++) {
      const [a, b] = tokens[i].split(',').map(Number)
      if (!Number.isFinite(a) || !Number.isFinite(b)) { ok = false; break }
      if (i === 0) p.push(a, b)
      else p.push(p[p.length - 2] + a, p[p.length - 1] + b)
    }
    if (ok && p.length >= 2) out.push({ c, p })
  }
  return out
}

export const serializeInk = (strokes: Stroke[]): string =>
  strokes
    .map(({ c, p }) => {
      let s = `${c}:${p[0]},${p[1]}`
      for (let i = 2; i < p.length; i += 2) s += ` ${p[i] - p[i - 2]},${p[i + 1] - p[i - 1]}`
      return s
    })
    .join('|')

export const strokePath = (p: number[]): string => {
  const n = p.length / 2
  if (n === 1) return `M${p[0]} ${p[1]}L${p[0] + 0.1} ${p[1]}`
  if (n === 2) return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`
  let d = `M${p[0]} ${p[1]}`
  for (let i = 1; i < n - 1; i++) {
    const x = p[2 * i]
    const y = p[2 * i + 1]
    d += `Q${x} ${y} ${(x + p[2 * i + 2]) / 2} ${(y + p[2 * i + 3]) / 2}`
  }
  return `${d}L${p[2 * n - 2]} ${p[2 * n - 1]}`
}

export const isFarEnough = (p: number[], x: number, y: number): boolean => {
  const dx = x - p[p.length - 2]
  const dy = y - p[p.length - 1]
  return dx * dx + dy * dy >= MIN_STEP * MIN_STEP
}

const segmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export const touches = ({ p }: Stroke, x: number, y: number, radius: number): boolean => {
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= radius
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (segmentDistance(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= radius) return true
  }
  return false
}

export const clampPoint = (x: number, y: number): [number, number] => [
  Math.round(Math.max(0, Math.min(INK_W, x))),
  Math.round(Math.max(0, Math.min(INK_H, y))),
]
