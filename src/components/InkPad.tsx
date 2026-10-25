import React, { useEffect, useMemo, useState } from 'react'
import { GestureResponderEvent, PanResponder, StyleSheet, View } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import { Text } from '../ui'
import { ERASER_PX, INK_H, INK_MAX, INK_W, INK_WIDTH, RULE_GAP, Stroke, clampPoint, isFarEnough, parseInk, serializeInk, strokePath, touches } from '../ink'
import { useLayout } from '../layout'
import { font, makeStyles, palettes, radius, theme, useScheme } from '../theme'
import ConfirmModal from './ConfirmModal'
import Icon from './Icon'
import IconButton from './IconButton'
import Tappable from './Tappable'

interface Props {
  value?: string
  onChange: (next: string) => void
}

type Tool = 'pen' | 'eraser'

// The eraser has no glyph in the icon font we use, so it is drawn here
function EraserIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path fill={color} d="M16.24 3.56L21.19 8.5C21.97 9.29 21.97 10.55 21.19 11.34L12 20.53C10.44 22.09 7.91 22.09 6.34 20.53L2.81 17C2.03 16.21 2.03 14.95 2.81 14.16L13.41 3.56C14.2 2.78 15.46 2.78 16.24 3.56M4.22 15.58L7.76 19.11C8.54 19.9 9.8 19.9 10.59 19.11L14.12 15.58L9.17 10.63L4.22 15.58Z" />
    </Svg>
  )
}

const RULES = Array.from({ length: Math.floor(INK_H / RULE_GAP) - 1 }, (_, i) => (i + 2) * RULE_GAP)
const NONE: ReadonlySet<number> = new Set()

interface DrawnProps { strokes: Stroke[]; paths: string[]; gone: ReadonlySet<number>; colours: string[] }

const Drawn = React.memo(function Drawn({ strokes, paths, gone, colours }: DrawnProps) {
  return (
    <>
      {strokes.map((st, i) => gone.has(i) ? null : (
        <Path key={i} d={paths[i]} stroke={colours[st.c] || colours[0]} strokeWidth={INK_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </>
  )
})

interface InkState { strokes: Stroke[]; tool: Tool; colour: number; width: number; onChange: (next: string) => void }
interface InkSetters {
  setLive: (points: number[]) => void
  setGone: (gone: ReadonlySet<number>) => void
  setFull: (full: boolean) => void
}

function createInkResponder({ setLive, setGone, setFull }: InkSetters) {
  let latest: InkState = { strokes: [], tool: 'pen', colour: 0, width: 0, onChange: () => undefined }
  let points: number[] = []
  let erased = new Set<number>()

  const scaleNow = () => latest.width / INK_W || 1
  const at = (e: GestureResponderEvent) => {
    const scale = scaleNow()
    return clampPoint(e.nativeEvent.locationX / scale, e.nativeEvent.locationY / scale)
  }
  const erase = (x: number, y: number) => {
    const before = erased.size
    latest.strokes.forEach((st, i) => { if (!erased.has(i) && touches(st, x, y, ERASER_PX / scaleNow())) erased.add(i) })
    if (erased.size !== before) setGone(new Set(erased))
  }
  const finish = () => {
    const { strokes: all, tool: active, colour: c, onChange: save } = latest
    if (active === 'eraser') {
      if (erased.size) save(serializeInk(all.filter((_, i) => !erased.has(i))))
      erased = new Set()
      setGone(NONE)
      return
    }
    const p = points
    points = []
    setLive([])
    if (p.length < 2) return
    const next = serializeInk([...all, { c, p }])
    if (next.length > INK_MAX) { setFull(true); return }
    save(next)
  }

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: e => {
      const [x, y] = at(e)
      setFull(false)
      if (latest.tool === 'eraser') { erase(x, y); return }
      points = [x, y]
      setLive([x, y])
    },
    onPanResponderMove: e => {
      const [x, y] = at(e)
      if (latest.tool === 'eraser') { erase(x, y); return }
      if (!isFarEnough(points, x, y)) return
      points.push(x, y)
      setLive(points.slice())
    },
    onPanResponderRelease: () => finish(),
    onPanResponderTerminate: () => finish(),
  })

  return { responder, sync: (next: InkState) => { latest = next } }
}

export default function InkPad({ value, onChange }: Props) {
  const s = useS()
  const scheme = useScheme()
  const { dialog, height: screen } = useLayout()
  const colours = useMemo(() => [palettes[scheme].ink, palettes[scheme].brand, palettes[scheme].danger], [scheme])
  const strokes = useMemo(() => parseInk(value), [value])
  const paths = useMemo(() => strokes.map(st => strokePath(st.p)), [strokes])
  const [tool, setTool] = useState<Tool>('pen')
  const [colour, setColour] = useState(0)
  const [width, setWidth] = useState(0)
  const [live, setLive] = useState<number[]>([])
  const [gone, setGone] = useState<ReadonlySet<number>>(NONE)
  const [full, setFull] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const [pad] = useState(() => createInkResponder({ setLive, setGone, setFull }))
  useEffect(() => {
    pad.sync({ strokes, tool, colour, width, onChange })
  })

  const height = width * INK_H / INK_W
  const room = Math.max(240, (dialog ? Math.min(screen - 48, 780) : screen - 100) - 190)
  const fit = useMemo(() => ({ maxWidth: room * INK_W / INK_H }), [room])

  return (
    <View style={s.wrap}>
      <View style={s.tools}>
        <View style={s.group}>
          {(['pen', 'eraser'] as const).map(t => (
            <Tappable key={t} onPress={() => setTool(t)} pressedScale={0.92} accessibilityRole="button" accessibilityState={{ selected: tool === t }} accessibilityLabel={t === 'pen' ? 'Pen' : 'Eraser'} selected={tool === t} style={[s.tool, tool === t && s.toolOn]}>
              {t === 'pen'
                ? <Icon name="edit" size={22} color={tool === t ? theme.brand : theme.muted} />
                : <EraserIcon size={22} color={tool === t ? theme.brand : theme.muted} />}
            </Tappable>
          ))}
        </View>
        <View style={s.group}>
          {colours.map((hex, i) => (
            <Tappable key={i} onPress={() => { setColour(i); setTool('pen') }} hitSlop={4} pressedScale={0.9} accessibilityRole="button" accessibilityState={{ selected: tool === 'pen' && colour === i }} accessibilityLabel={['Black ink', 'Blue ink', 'Red ink'][i]} style={[s.ring, tool === 'pen' && colour === i && s.ringOn]}>
              <View style={[s.dot, { backgroundColor: hex }]} />
            </Tappable>
          ))}
        </View>
        <View style={s.fill} />
        <View style={strokes.length ? null : s.off}>
          <IconButton icon="undo" label="Undo last stroke" size={36} disabled={!strokes.length} onPress={() => onChange(serializeInk(strokes.slice(0, -1)))} />
        </View>
        <View style={strokes.length ? null : s.off}>
          <IconButton icon="trash" label="Clear handwriting" size={36} tone="danger" disabled={!strokes.length} onPress={() => setConfirm(true)} />
        </View>
      </View>

      <View nativeID="ink-page" style={[s.page, fit]} onLayout={e => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Handwriting page" {...pad.responder.panHandlers}>
        {width > 0 ? (
          <View style={s.canvas}>
            <Svg width={width} height={height} viewBox={`0 0 ${INK_W} ${INK_H}`}>
              {RULES.map(y => <Line key={y} x1={0} x2={INK_W} y1={y} y2={y} stroke={theme.line} strokeWidth={1.5} />)}
              <Drawn strokes={strokes} paths={paths} gone={gone} colours={colours} />
              {live.length >= 2 ? <Path d={strokePath(live)} stroke={colours[colour]} strokeWidth={INK_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </Svg>
          </View>
        ) : null}
      </View>
      {full ? <Text style={s.full}>This page is full. Erase something, or start another note.</Text> : null}

      <ConfirmModal
        visible={confirm} danger icon="trash" title="Clear handwriting?" confirmLabel="Clear"
        message="Everything written on this page is removed."
        onCancel={() => setConfirm(false)}
        onConfirm={() => { onChange(''); setConfirm(false) }}
      />
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { gap: 10 },
  fill: { flex: 1 },
  off: { opacity: 0.4 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tool: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.card },
  toolOn: { borderColor: theme.brand, backgroundColor: theme.brandSoft },
  ring: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: theme.muted },
  dot: { width: 24, height: 24, borderRadius: 12 },
  page: { width: '100%', alignSelf: 'center', aspectRatio: INK_W / INK_H, borderRadius: radius.sm + 2, borderWidth: 1.5, borderColor: theme.inputLine, backgroundColor: theme.card, overflow: 'hidden' },
  canvas: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  full: { ...font.caption, fontWeight: '600', color: theme.danger, textAlign: 'center' },
}))
