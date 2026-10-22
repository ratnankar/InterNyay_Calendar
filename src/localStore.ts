import AsyncStorage from '@react-native-async-storage/async-storage'

// Larger values on the phone (the saved hearings, the preferences). They are cut into pieces because Android cannot
// read one very large stored value back. The "meta" entry is written last, so a save that is cut short leaves the
// previous copy untouched; a copy that cannot be read completely reads as "nothing saved".

const PIECE = 400_000

interface Meta { gen: number; n: number }

const pieceKeys = (key: string, m: Meta) => Array.from({ length: m.n }, (_, i) => `${key}:${m.gen}:${i}`)

function parseMeta(raw: string | null): Meta | null {
  if (!raw) return null
  try {
    const m = JSON.parse(raw)
    return typeof m?.gen === 'number' && Number.isInteger(m?.n) && m.n >= 0 ? m : null
  } catch { return null }
}

export async function readBig<T>(key: string): Promise<T | null> {
  try {
    const meta = parseMeta(await AsyncStorage.getItem(`${key}:meta`))
    if (!meta) return null
    const parts = await AsyncStorage.multiGet(pieceKeys(key, meta))
    let raw = ''
    for (const [, v] of parts) {
      if (v === null) return null
      raw += v
    }
    return JSON.parse(raw) as T
  } catch { return null }
}

export async function writeBig(key: string, value: unknown): Promise<boolean> {
  try {
    const json = JSON.stringify(value)
    const old = parseMeta(await AsyncStorage.getItem(`${key}:meta`))
    const gen = Date.now()
    const n = Math.ceil(json.length / PIECE)
    const pairs: [string, string][] = []
    for (let i = 0; i < n; i++) pairs.push([`${key}:${gen}:${i}`, json.slice(i * PIECE, (i + 1) * PIECE)])
    if (pairs.length) await AsyncStorage.multiSet(pairs)
    await AsyncStorage.setItem(`${key}:meta`, JSON.stringify({ gen, n }))
    if (old) await AsyncStorage.multiRemove(pieceKeys(key, old)).catch(() => undefined)
    return true
  } catch { return false }
}

export async function removeBig(key: string): Promise<void> {
  try {
    const meta = parseMeta(await AsyncStorage.getItem(`${key}:meta`))
    await AsyncStorage.multiRemove([...(meta ? pieceKeys(key, meta) : []), `${key}:meta`])
  } catch { }
}
