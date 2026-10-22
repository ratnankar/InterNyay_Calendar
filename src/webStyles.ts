import { Platform } from 'react-native'
import { palettes, Scheme } from './theme'

const CSS = `
:focus-visible { outline: 2px solid var(--iny-focus, #1F4FA0); outline-offset: 2px; }
input:focus-visible, textarea:focus-visible { outline: none; }
* { scrollbar-width: thin; scrollbar-color: var(--iny-thumb, #C4C7CC) transparent; }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--iny-thumb, #C4C7CC); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
body, input, textarea, button, select { font-family: 'SourceSans3_400Regular', system-ui, -apple-system, 'Segoe UI', sans-serif; }
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
input::placeholder, textarea::placeholder { font-family: inherit; }
html, body { overscroll-behavior: none; -webkit-text-size-adjust: 100%; background: var(--iny-page, #FFFFFF); }
[role="button"], [role="checkbox"] { -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
#ink-page { touch-action: none; user-select: none; -webkit-user-select: none; cursor: crosshair; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
`

export function installWebStyles(): void {
  const doc = (globalThis as any).document
  if (Platform.OS !== 'web' || !doc || doc.getElementById('internyay-web-css')) return
  const style = doc.createElement('style')
  style.id = 'internyay-web-css'
  style.textContent = CSS
  doc.head.appendChild(style)

  doc.title = 'InterNyay Calendar'
  const viewport = doc.querySelector('meta[name="viewport"]')
  if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
  if (!doc.querySelector('meta[name="theme-color"]')) {
    const meta = doc.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#0A1628'
    doc.head.appendChild(meta)
  }
}

export function applyWebScheme(scheme: Scheme): void {
  const doc = (globalThis as any).document
  if (Platform.OS !== 'web' || !doc) return
  const p = palettes[scheme]
  const root = doc.documentElement
  root.style.setProperty('--iny-page', p.card)
  root.style.setProperty('--iny-focus', p.focus)
  root.style.setProperty('--iny-thumb', scheme === 'dark' ? '#4A4F57' : '#C4C7CC')
  root.style.colorScheme = scheme
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', scheme === 'dark' ? p.card : p.navy)
}
