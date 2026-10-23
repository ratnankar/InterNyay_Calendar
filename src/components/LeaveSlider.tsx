import { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Keyboard, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { longDate, MONTHS, parseKey } from '../dates'
import { noCourtSelected } from '../hearings'
import { leaveForEntry, leavesOn, sameCourt } from '../leave'
import { native, useReduceMotion } from '../motion'
import { font, liftShadow, makeStyles, radius, theme } from '../theme'
import { HearingEntry, JudgeLeave } from '../types'
import Icon from './Icon'
import LeaveByDay from './LeaveByDay'
import { CourtChips, LeaveRows, LeaveSearch } from './LeaveParts'
import Tappable from './Tappable'

export const HANDLE_HEIGHT = 48

const MIN_PANEL = 240
const MAX_PANEL = 560

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  scope?: 'month' | 'day'
  bottomInset?: number
  onPickDate?: (date: string) => void
  leaves: JudgeLeave[]
  entries: HearingEntry[]
  courts: string[]
  selectedCourt: string[]
  colourOf: (court: string) => string
}

export default function LeaveSlider({ open, onOpenChange, date, scope = 'month', bottomInset = 0, onPickDate, leaves, entries, courts, selectedCourt, colourOf }: Props) {
  const s = useS()
  const reduce = useReduceMotion()
  const [zoneHeight, setZoneHeight] = useState(0)
  const [chips, setChips] = useState<string[]>([])
  // Day view search: judge name, court, district or reason
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  // The panel is only drawn once it has been put at its real closed position, so it never flashes open on reload
  const [placed, setPlaced] = useState(false)
  // The day list is only built once the panel has been opened, so app start and reload stay light
  const [everOpened, setEverOpened] = useState(open)
  useEffect(() => { if (open) setEverOpened(true) }, [open])

  const panelHeight = Math.max(MIN_PANEL, Math.min(MAX_PANEL, Math.round(zoneHeight * 0.8)))

  // On a phone the keyboard slides over the bottom of the screen, and this panel is anchored to the bottom,
  // so the search box ended up underneath it. While the keyboard is up, lift the panel above it and shrink it to fit.
  const zoneRef = useRef<ComponentRef<typeof View>>(null)
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const ios = Platform.OS === 'ios'
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', e => {
      zoneRef.current?.measureInWindow((_x, y, _w, h) => setLift(Math.max(0, Math.round(y + h - e.endCoordinates.screenY))))
    })
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setLift(0))
    return () => { show.remove(); hide.remove() }
  }, [])
  const shownHeight = lift > 0 ? Math.max(200, Math.min(panelHeight, zoneHeight - lift - 8)) : panelHeight
  const handleHeight = HANDLE_HEIGHT + bottomInset
  const closedY = panelHeight - handleHeight
  const y = useRef(new Animated.Value(closedY)).current
  const start = useRef(0)
  const limit = useRef(closedY)
  limit.current = closedY

  // The panel carries on at the speed the finger let go with, then comes to rest without bouncing past its end
  const settle = useCallback((target: boolean, vy = 0) => {
    const to = target ? 0 : limit.current
    if (reduce) { y.setValue(to); return }
    Animated.spring(y, { toValue: to, velocity: vy * 1000, damping: 30, stiffness: 320, mass: 1, overshootClamping: true, useNativeDriver: native }).start()
  }, [y, reduce])

  const settleRef = useRef(settle)
  settleRef.current = settle
  const changeRef = useRef(onOpenChange)
  changeRef.current = onOpenChange

  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    if (zoneHeight <= 0) return
    y.setValue(openRef.current ? 0 : closedY)
    setPlaced(true)
  }, [closedY, zoneHeight, y])

  useEffect(() => { if (placed) settle(open) }, [open, settle, placed])

  useEffect(() => { if (!open) setQuery('') }, [open])

  useEffect(() => {
    if (open) setChips(noCourtSelected(selectedCourt) ? [] : selectedCourt.filter(Boolean))
  }, [open, selectedCourt])

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => y.stopAnimation(v => { start.current = v }),
      onPanResponderMove: (_, g) => y.setValue(Math.min(limit.current, Math.max(0, start.current + g.dy))),
      onPanResponderRelease: (_, g) => {
        const v = Math.min(limit.current, Math.max(0, start.current + g.dy))
        const target = g.vy < -0.4 ? true : g.vy > 0.4 ? false : v < limit.current / 2
        settleRef.current(target, g.vy)
        changeRef.current(target)
      },
    }),
  )

  const daily = scope === 'day'
  const prefix = date.slice(0, 7)
  const label = daily ? longDate(date) : `${MONTHS[parseKey(date).getMonth()]} ${parseKey(date).getFullYear()}`

  const monthLeaves = useMemo(
    () => (daily
      ? leavesOn(leaves, date).sort((a, b) => (a.court || '').localeCompare(b.court || '') || a.name.localeCompare(b.name))
      : leaves
        .filter(l => l.leaveFrom <= `${prefix}-31` && (l.leaveTo || l.leaveFrom) >= `${prefix}-01`)
        .sort((a, b) => a.leaveFrom.localeCompare(b.leaveFrom) || a.name.localeCompare(b.name))),
    [leaves, prefix, date, daily],
  )

  const courtLeaves = useMemo(
    () => (chips.length ? monthLeaves.filter(l => chips.some(c => sameCourt(l.court, c))) : monthLeaves),
    [monthLeaves, chips],
  )

  const archiveLeaves = useMemo(
    () => (chips.length ? leaves.filter(l => chips.some(c => sameCourt(l.court, c))) : leaves),
    [leaves, chips],
  )

  const rows = useMemo(() => {
    if (!daily) return []
    return courtLeaves
      .filter(l => !needle || [l.name, l.court, l.district, l.reason].some(v => (v || '').toLowerCase().includes(needle)))
      .map(l => ({ leave: l, cases: entries.filter(e => leaveForEntry([l], e)) }))
      .sort((a, b) => b.cases.length - a.cases.length)
  }, [courtLeaves, entries, daily, needle])

  const pick = (d: string) => onPickDate?.(d)

  return (
    <View ref={zoneRef} collapsable={false} style={s.zone} pointerEvents="box-none" onLayout={e => setZoneHeight(e.nativeEvent.layout.height)}>
      {zoneHeight > 0 && placed ? (
        <>
          <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[s.scrim, { opacity: y.interpolate({ inputRange: [0, closedY], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
            <Pressable style={s.fill} onPress={() => onOpenChange(false)} accessibilityLabel="Close judges on leave" />
          </Animated.View>

          <Animated.View style={[s.panel, { height: shownHeight, bottom: lift, transform: [{ translateY: y }] }]}>
            <View {...pan.panHandlers}>
              <Tappable
                onPress={() => onOpenChange(!open)}
                pressedScale={0.99}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel="Judges on leave"
                style={[s.handle, { height: handleHeight, paddingBottom: bottomInset }]}
              >
                <View style={s.grabber} />
                <View style={s.handleRow}>
                  <Icon name="leave" size={18} color={theme.danger} />
                  <Text style={s.title}>Judges on leave</Text>
                  <View style={s.badge}><Text style={s.badgeText}>{monthLeaves.length}</Text></View>
                  <Icon name={open ? 'chevronDown' : 'chevronUp'} size={22} color={theme.muted} />
                </View>
              </Tappable>
            </View>

            <CourtChips courts={courts} value={chips} onChange={setChips} colourOf={colourOf} />

            {daily ? (
              <>
                <LeaveSearch value={query} onChange={setQuery} placeholder="Search judge, court or reason" label="Search judges on leave" />
                <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={s.summary}>
                    {needle
                      ? `${rows.length} judge${rows.length === 1 ? '' : 's'} match your search on ${label}`
                      : `${rows.length} judge${rows.length === 1 ? '' : 's'} on leave on ${label}`}
                  </Text>
                  {rows.length === 0 ? (
                    <Text style={s.empty}>
                      {needle ? 'No judges match your search on this day.' : chips.length ? 'No judges on leave for the selected courts on this day.' : 'No judges on leave on this day.'}
                    </Text>
                  ) : null}
                  <LeaveRows items={rows} />
                </ScrollView>
              </>
            ) : !everOpened ? null : (
              <LeaveByDay month={date} leaves={courtLeaves} archive={archiveLeaves} entries={entries} filtered={chips.length > 0} onPickDate={pick} />
            )}
          </Animated.View>
        </>
      ) : null}
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  zone: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: theme.line, ...liftShadow },
  handle: { height: HANDLE_HEIGHT, paddingHorizontal: 16, justifyContent: 'center' },
  grabber: { position: 'absolute', top: 6, alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.line },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  title: { flex: 1, ...font.body, fontWeight: '700', color: theme.danger },
  badge: { minWidth: 22, alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerLine },
  badgeText: { ...font.caption, fontVariant: font.digits, fontWeight: '700', color: theme.danger },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 12 },
  summary: { ...font.small, color: theme.muted },
  empty: { textAlign: 'center', ...font.body, color: theme.muted, marginTop: 24 },
}))
