import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { useLatest, useOnChange } from '../hooks'
import { addMonths, dateKey, dayLabel, inMonth, longDate, MONTHS, parseKey, relativeLabel, todayKey, WEEKDAY_LETTERS } from '../dates'
import { leaveForEntry, leavesOn } from '../leave'
import { animateLayout, useSlideIn } from '../motion'
import { font, makeStyles, radius, theme } from '../theme'
import { HearingEntry, JudgeLeave } from '../types'
import Expand from './Expand'
import Icon from './Icon'
import IconButton from './IconButton'
import { LeaveItem, LeaveRows, LeaveSearch } from './LeaveParts'
import Reveal from './Reveal'
import Tappable from './Tappable'

interface Props {
  month: string
  leaves: JudgeLeave[]
  archive: JudgeLeave[]
  entries: HearingEntry[]
  filtered: boolean
  onPickDate: (date: string) => void
}

const CHIP = 44
const GAP = 4

export default function LeaveByDay({ month: monthProp, leaves, archive, entries, filtered, onPickDate }: Props) {
  const s = useS()
  const [month, setMonth] = useState(monthProp)
  useOnChange(monthProp, setMonth)
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const [viewport, setViewport] = useState(0)
  // Opens on the current date; "All days" is the optional whole-month overview
  const [all, setAll] = useState(false)
  const [mode, setMode] = useState<'days' | 'archive'>('days')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickYear, setPickYear] = useState(parseKey(month).getFullYear())
  const [archiveQuery, setArchiveQuery] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const [limits, setLimits] = useState<Record<string, number>>({})
  const first = useRef(true)

  // One search box for both views: judge name, court, district or reason (never a date)
  const needle = archiveQuery.trim().toLowerCase()
  const searching = needle.length > 0
  // While searching, matches are shown for the whole month rather than a single day
  const day: string | null = all || searching ? null : month
  const today = todayKey()
  const thisMonth = today.slice(0, 7)
  const ref = parseKey(month)
  const label = `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`
  const slide = useSlideIn(ref.getFullYear() * 12 + ref.getMonth(), 0.3)

  const visibleLeaves = useMemo(
    () => (needle ? leaves.filter(l => [l.name, l.court, l.district, l.reason].some(v => (v || '').toLowerCase().includes(needle))) : leaves),
    [leaves, needle],
  )

  // Keyed on the month, not the day: picking another day of the same month must not rebuild anything
  const monthId = month.slice(0, 7)
  const keys = useMemo(() => {
    const d = parseKey(monthId + '-01')
    const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    return Array.from({ length: count }, (_, i) => dateKey(new Date(d.getFullYear(), d.getMonth(), i + 1)))
  }, [monthId])

  const entriesOn = useMemo(() => {
    const m = new Map<string, HearingEntry[]>()
    entries.forEach(e => { const l = m.get(e.date); if (l) l.push(e); else m.set(e.date, [e]) })
    return m
  }, [entries])

  // Cheap part, for the whole month: which judges are on leave each day (also drives the red dots)
  const leavesByDay = useMemo(() => {
    const out = new Map<string, JudgeLeave[]>()
    keys.forEach(k => out.set(k, leavesOn(visibleLeaves, k)))
    return out
  }, [keys, visibleLeaves])

  // Costly part (matching each leave to your hearings) runs only for the days actually shown
  const sections = useMemo(() => {
    const matched = (k: string): LeaveItem[] => {
      const list = entriesOn.get(k) || []
      return (leavesByDay.get(k) || [])
        .map(l => ({ leave: l, cases: list.length ? list.filter(e => leaveForEntry([l], e)) : [] }))
        .sort((a, b) => b.cases.length - a.cases.length || (a.leave.court || '').localeCompare(b.leave.court || '') || a.leave.name.localeCompare(b.leave.name))
    }
    return keys.filter(k => (day ? k === day : true)).map(k => ({ key: k, items: matched(k) })).filter(sec => sec.items.length > 0)
  }, [keys, leavesByDay, entriesOn, day])

  useEffect(() => {
    if (!viewport) return
    if (!day) { scroller.current?.scrollTo({ x: 0, animated: false }); return }
    const index = keys.indexOf(day)
    if (index < 0) return
    scroller.current?.scrollTo({ x: Math.max(0, index * (CHIP + GAP) - viewport / 2 + CHIP / 2), animated: !first.current })
    first.current = false
  }, [day, keys, viewport])

  const choose = (key: string) => {
    setMonth(key)
    startTransition(() => onPickDate(key))
  }
  const pickDay = (key: string) => { setAll(false); choose(key) }

  // Month changes keep the current view (one day or the whole-month overview); the current month lands on today
  const moveTo = (key: string) => choose(key.startsWith(thisMonth) ? today : key)

  const clear = () => setAll(true)
  const getDay = useLatest(day)
  // Stable, so only the chip that was selected and the one now selected redraw on a pick
  const getChoose = useLatest(choose)
  const onChip = useCallback((k: string) => { if (k === getDay()) setAll(true); else { setAll(false); getChoose()(k) } }, [getChoose, getDay])

  const stepMonth = (n: number) => { setPickerOpen(false); moveTo(addMonths(month, n)) }
  const pickMonth = (m: number) => { setPickerOpen(false); moveTo(inMonth(month, pickYear, m)) }
  const goToday = () => { setPickerOpen(false); setMode('days'); pickDay(today) }

  const archiveCutoff = todayKey()
  const groups = useMemo(() => {
    const out = new Map<string, JudgeLeave[]>()
    archive
      .filter(l => (l.leaveTo || l.leaveFrom) < archiveCutoff)
      .filter(l => !needle || [l.name, l.court, l.district, l.reason].some(v => (v || '').toLowerCase().includes(needle)))
      .sort((a, b) => b.leaveFrom.localeCompare(a.leaveFrom) || a.name.localeCompare(b.name))
      .forEach(l => { const k = l.leaveFrom.slice(0, 7); out.set(k, [...(out.get(k) || []), l]) })
    return [...out.entries()]
  }, [archive, archiveCutoff, needle])
  const archiveTotal = groups.reduce((n, [, list]) => n + list.length, 0)

  const shown = day ? (leavesByDay.get(day) || []).length : visibleLeaves.length

  const header = (
    <View style={s.head}>
      {mode === 'days' ? (
        <>
          <IconButton icon="chevronLeft" label="Previous month" tone="plain" size={32} onPress={() => stepMonth(-1)} />
          <Tappable
            onPress={() => { setPickYear(ref.getFullYear()); setPickerOpen(o => !o) }}
            pressedScale={0.97}
            accessibilityRole="button"
            accessibilityState={{ expanded: pickerOpen }}
            accessibilityLabel={`${label}, change month`}
            style={s.monthBtn}
          >
            <Text style={s.monthText} numberOfLines={1}>{label}</Text>
            <Icon name={pickerOpen ? 'chevronUp' : 'chevronDown'} size={20} color={theme.muted} />
          </Tappable>
          <IconButton icon="chevronRight" label="Next month" tone="plain" size={32} onPress={() => stepMonth(1)} />
        </>
      ) : (
        <>
          <IconButton icon="back" label="Back to days" tone="plain" size={36} onPress={() => setMode('days')} />
          <Text style={s.monthText}>Archive</Text>
        </>
      )}
      <View style={s.fill} />
      {mode === 'days' && day !== today ? (
        <Tappable onPress={goToday} pressedScale={0.95} accessibilityRole="button" accessibilityLabel="Go to today" style={s.pillIcon}>
          <Icon name="today" size={18} color={theme.brand} />
        </Tappable>
      ) : null}
      <Tappable
        onPress={() => { setPickerOpen(false); setMode(m => (m === 'archive' ? 'days' : 'archive')) }}
        pressedScale={0.95}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === 'archive' }}
        accessibilityLabel="Archive of past leave"
        style={[s.pill, mode === 'archive' && s.pillOn]}
      >
        <Icon name="archive" size={16} color={theme.brand} />
        <Text style={s.pillText}>Archive</Text>
      </Tappable>
    </View>
  )

  const picker = (
    <Expand open={pickerOpen && mode === 'days'}>
      <View style={s.picker}>
        <View style={s.pickerYear}>
          <IconButton icon="chevronLeft" label={`Previous year, ${pickYear - 1}`} tone="plain" size={32} onPress={() => setPickYear(y => y - 1)} />
          <Text style={s.pickerYearText}>{pickYear}</Text>
          <IconButton icon="chevronRight" label={`Next year, ${pickYear + 1}`} tone="plain" size={32} onPress={() => setPickYear(y => y + 1)} />
        </View>
        <View style={s.pickerGrid}>
          {MONTHS.map((name, m) => {
            const on = pickYear === ref.getFullYear() && m === ref.getMonth()
            const now = pickYear === parseKey(today).getFullYear() && m === parseKey(today).getMonth()
            return (
              <Tappable
                key={name}
                onPress={() => pickMonth(m)}
                pressedScale={0.95}
                containerStyle={s.monthSlot}
                selected={on}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${name} ${pickYear}`}
                style={[s.monthChip, on && s.chipOn, now && !on && s.monthNow]}
              >
                <Text style={[s.monthChipText, on && s.chipOnText]}>{name.slice(0, 3)}</Text>
              </Tappable>
            )
          })}
        </View>
      </View>
    </Expand>
  )

  if (mode === 'archive') {
    return (
      <Reveal key="archive" variant="fade" style={s.fill}>
        {header}
        <LeaveSearch value={archiveQuery} onChange={setArchiveQuery} placeholder="Search past leave by judge, court or reason" label="Search archive" />
        <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          <Text style={s.summary}>{archiveTotal} past leave{archiveTotal === 1 ? '' : 's'} before {longDate(today)}{groups.length ? ` · ${groups.length} month${groups.length === 1 ? '' : 's'}` : ''}</Text>
          {groups.length === 0 ? <Text style={s.empty}>{needle ? 'No past leave matches your search.' : 'No past leave on record.'}</Text> : null}
          {groups.map(([k, list], i) => {
            const open = needle ? true : (toggled[k] ?? i === 0)
            const cap = limits[k] ?? 40
            const name = `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`
            return (
              <View key={k} style={s.section}>
                <View style={s.dayHead}>
                  <Tappable
                    onPress={() => setToggled(v => ({ ...v, [k]: !open }))}
                    pressedScale={0.99}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`${name}, ${list.length} on leave`}
                    style={s.monthHead}
                  >
                    <Icon name={open ? 'chevronDown' : 'chevronRight'} size={20} color={theme.muted} />
                    <Text style={s.dayTitle}>{name}</Text>
                  </Tappable>
                  <View style={s.fill} />
                  <View style={s.count}><Text style={s.countText}>{list.length}</Text></View>
                </View>
                <Expand open={open}>
                  <>
                    <LeaveRows items={list.slice(0, cap).map(leave => ({ leave, cases: [] }))} />
                    {list.length > cap ? (
                      <Tappable onPress={() => { animateLayout(); setLimits(v => ({ ...v, [k]: cap + 40 })) }} pressedScale={0.97} accessibilityRole="button" style={s.more}>
                        <Text style={s.pillText}>Show more ({list.length - cap})</Text>
                      </Tappable>
                    ) : null}
                  </>
                </Expand>
              </View>
            )
          })}
        </ScrollView>
      </Reveal>
    )
  }

  return (
    <Reveal key="days" variant="fade" style={s.fill}>
      {header}
      {picker}
      <LeaveSearch value={archiveQuery} onChange={setArchiveQuery} placeholder="Search judge, court or reason" label="Search judges on leave" />
      <Animated.View style={[s.fill, slide]}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.strip}
        contentContainerStyle={s.stripRow}
        onLayout={e => setViewport(e.nativeEvent.layout.width)}
      >
        <Tappable
          onPress={clear}
          pressedScale={0.95}
          accessibilityRole="button"
          accessibilityState={{ selected: day === null }}
          selected={day === null}
          accessibilityLabel="All days"
          style={[s.allDays, day === null && s.chipOn]}
        >
          <Text style={[s.allText, day === null && s.chipOnText]}>All days</Text>
        </Tappable>
        {keys.map(k => (
          <DayChip key={k} k={k} on={k === day} has={(leavesByDay.get(k) || []).length > 0} onPick={onChip} />
        ))}
      </ScrollView>

      <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        <Text style={s.summary}>
          {day
            ? `${shown} judge${shown === 1 ? '' : 's'} on leave on ${longDate(day)}`
            : searching
              ? `${shown} judge${shown === 1 ? '' : 's'} match your search in ${label}${sections.length ? ` · ${sections.length} day${sections.length === 1 ? '' : 's'}` : ''}`
              : `${shown} judge${shown === 1 ? '' : 's'} on leave in ${label}${sections.length ? ` · ${sections.length} day${sections.length === 1 ? '' : 's'}` : ''}`}
        </Text>
        {sections.length === 0 ? (
          <Text style={s.empty}>
            {day ? 'No judges on leave on this day.' : searching ? 'No judges match your search this month.' : filtered ? 'No judges on leave for the selected courts this month.' : 'No judges on leave this month.'}
          </Text>
        ) : null}
        {sections.map(sec => {
          const rel = relativeLabel(sec.key)
          return (
            <View key={sec.key} style={s.section}>
              <View style={s.dayHead}>
                <Text style={s.dayTitle}>{dayLabel(sec.key)}</Text>
                {rel ? <View style={s.badge}><Text style={s.badgeText}>{rel}</Text></View> : null}
                <View style={s.fill} />
                <View style={s.count}><Text style={s.countText}>{sec.items.length}</Text></View>
              </View>
              <LeaveRows items={sec.items} />
            </View>
          )
        })}
      </ScrollView>
      </Animated.View>
    </Reveal>
  )
}

const DayChip = memo(function DayChip({ k, on, has, onPick }: { k: string; on: boolean; has: boolean; onPick: (k: string) => void }) {
  const s = useS()
  const d = parseKey(k)
  return (
    <Tappable
      onPress={() => onPick(k)}
      pressedScale={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      selected={on}
      accessibilityLabel={`${longDate(k)}${has ? ', judges on leave' : ''}`}
      style={[s.chip, on && s.chipOn]}
    >
      <Text style={[s.letter, on && s.chipOnText]}>{WEEKDAY_LETTERS[d.getDay()]}</Text>
      <Text style={[s.number, on && s.chipOnText]}>{d.getDate()}</Text>
      <View style={[s.dot, has && s.dotOn]} />
    </Tappable>
  )
})

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 16, paddingBottom: 8, minHeight: 40 },
  monthBtn: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 32, paddingHorizontal: 6, borderRadius: radius.pill },
  monthText: { flexShrink: 1, ...font.label, fontWeight: '700', color: theme.ink },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, paddingHorizontal: 12, flexShrink: 0, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line },
  pillIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line },
  pillOn: { backgroundColor: theme.blueSoft, borderColor: theme.brand },
  pillText: { ...font.small, fontWeight: '600', color: theme.brand },
  picker: { marginHorizontal: 16, marginBottom: 6, padding: 8, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, gap: 4 },
  pickerYear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickerYearText: { ...font.label, fontWeight: '700', fontVariant: font.digits, color: theme.ink, minWidth: 52, textAlign: 'center' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthSlot: { width: '25%', padding: 3 },
  monthChip: { height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  monthChipText: { ...font.body, fontWeight: '500', color: theme.ink },
  monthNow: { borderColor: theme.brand },
  monthHead: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32 },
  more: { alignSelf: 'center', height: 32, justifyContent: 'center', paddingHorizontal: 12 },
  strip: { flexGrow: 0 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: 16, paddingBottom: 8 },
  allDays: { height: 52, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  allText: { ...font.small, fontWeight: '600', color: theme.ink },
  chip: { width: CHIP, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: theme.blueSoft },
  chipOnText: { color: theme.brand, fontWeight: '700' },
  letter: { ...font.micro, color: theme.muted },
  number: { ...font.body, fontVariant: font.digits, fontWeight: '600', color: theme.ink },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  dotOn: { backgroundColor: theme.danger },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 14 },
  summary: { ...font.small, color: theme.muted },
  empty: { textAlign: 'center', ...font.body, color: theme.muted, marginTop: 24 },
  section: { gap: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayTitle: { ...font.label, fontWeight: '700', color: theme.ink },
  badge: { backgroundColor: theme.blueSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { ...font.caption, fontWeight: '700', color: theme.brand },
  count: { minWidth: 22, alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerLine },
  countText: { ...font.caption, fontVariant: font.digits, fontWeight: '700', color: theme.danger },
}))
