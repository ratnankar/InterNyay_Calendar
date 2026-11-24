import React, { useMemo, useState } from 'react'
import { Animated, Pressable, RefreshControlProps, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { dateKey, MONTHS, monthOffset, todayKey, weekdayNames } from '../dates'
import { MONTH_SPAN, useMonthSlider } from '../motion'
import { firstParty, inCourts } from '../hearings'
import { leaveForEntry } from '../leave'
import { itemOf } from '../listNo'
import { HearingEntry, Holiday, JudgeLeave } from '../types'
import { font, makeStyles, readable, theme, withAlpha } from '../theme'
import HolidayFill from './HolidayFill'
import LeaveBadge from './LeaveBadge'

interface Props {
  year: number
  month: number
  // Not read directly: it only makes the memoised grid redraw when the week start setting changes
  weekStart: 0 | 1
  byDate: Map<string, HearingEntry[]>
  holidayByDate: Map<string, Holiday>
  noHearing: Set<string>
  judgeLeaves: JudgeLeave[]
  selectedCourt: string[]
  selected?: string
  colourOf: (court: string) => string
  onSelectDate: (key: string) => void
  onChangeMonth: (delta: number) => void
  onSwipeUp?: () => void
  refreshControl?: React.ReactElement<RefreshControlProps>
}

const MIN_ROW = 84
const NUMBER_BLOCK = 30

type Chip = { key: string; label: string; colour?: string; holiday?: Holiday; muted?: boolean; leave?: boolean; misc?: boolean }

const NARROW_CELL = 58
const ROOMY_CELL = 104

interface CellProps {
  k: string
  day: number
  monthName: string
  startOfMonth: boolean
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  chips: Chip[]
  capacity: number
  roomy: boolean
  chipH: number
  onSelect: (key: string) => void
}

// One day. Memoised, so picking a date or changing the month only redraws the cells that actually changed.
const DayCell = React.memo(function DayCell({ k, day, monthName, startOfMonth, inMonth, isToday, isSelected, chips, capacity, roomy, chipH, onSelect }: CellProps) {
  const s = useS()
  const overflow = chips.length > capacity
  const visible = overflow ? chips.slice(0, Math.max(1, capacity - 1)) : chips
  const hidden = chips.length - visible.length
  return (
    <Pressable
      onPress={() => onSelect(k)}
      accessibilityRole="button"
      accessibilityLabel={`${day} ${monthName}, ${chips.length === 0 ? 'no items' : `${chips.length} item${chips.length === 1 ? '' : 's'}`}${chips.some(c => c.misc) ? ', includes a miscellaneous application' : ''}${chips.some(c => c.leave) ? ', a judge is on leave' : ''}`}
      style={s.cell}
      unstable_pressDelay={120}
    >
      {(state) => (
      <View style={[s.tile, (state as any).hovered && s.cellHover, state.pressed && s.cellPressed]}>
      <View style={[s.num, isSelected && !isToday && s.numSelected, isToday && s.numToday]}>
        <Text style={[s.numText, isSelected && !isToday && s.numTextSelected, isToday && s.numTextToday]}>
          {startOfMonth ? `${day} ${monthName.slice(0, 3)}` : day}
        </Text>
      </View>
      {visible.map(c => {
        const ink = c.colour ? readable(c.colour) : null
        return (
          <View key={c.key} style={[s.chip, roomy && s.chipRoomy, c.misc && s.chipMisc, { height: chipH }, c.colour ? { backgroundColor: c.colour } : c.muted ? s.chipMuted : null, !inMonth && s.chipOut]}>
            {c.holiday ? <HolidayFill holiday={c.holiday} /> : null}
            {c.misc && ink ? <View style={[s.miscBar, { backgroundColor: ink.ink }]} /> : null}
            {c.leave ? <LeaveBadge dot /> : null}
            <Text style={[s.chipText, roomy && s.chipTextRoomy, ink ? { color: ink.ink } : null, c.muted && s.chipTextMuted]} numberOfLines={1}>{c.label}</Text>
          </View>
        )
      })}
      {hidden > 0 ? <Text style={s.more}>{hidden} more</Text> : null}
      </View>
      )}
    </Pressable>
  )
})

interface GridProps {
  year: number
  month: number
  width: number
  viewport: number
  weekStart: 0 | 1
  byDate: Map<string, HearingEntry[]>
  holidayByDate: Map<string, Holiday>
  noHearing: Set<string>
  judgeLeaves: JudgeLeave[]
  selectedCourt: string[]
  selected?: string
  colourOf: (court: string) => string
  onSelectDate: (key: string) => void
}

// One month's grid. Three of these sit side by side so the neighbouring months are already there while sliding.
const MonthGrid = React.memo(function MonthGrid({ year, month, width, viewport, byDate, holidayByDate, noHearing, judgeLeaves, selectedCourt, selected, colourOf, onSelectDate }: GridProps) {
  const s = useS()
  const today = todayKey()
  const first = monthOffset(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rows = Math.ceil((first + daysInMonth) / 7)
  const cellW = width / 7
  const narrow = cellW > 0 && cellW < NARROW_CELL
  const roomy = cellW >= ROOMY_CELL
  const chipH = roomy ? 22 : 16
  const rowHeight = Math.max(MIN_ROW, viewport ? viewport / rows : MIN_ROW)
  const capacity = Math.max(1, Math.floor((rowHeight - NUMBER_BLOCK) / (chipH + 2)))

  // Every day's items are worked out once per month or data change, not on every redraw
  const cells = useMemo(() => {
    const chipsFor = (key: string): Chip[] => {
      const out: Chip[] = []
      const holiday = holidayByDate.get(key)
      if (holiday) out.push({ key: `h-${key}`, label: holiday.label, holiday })
      if (noHearing.has(key)) out.push({ key: `n-${key}`, label: 'No hearing', muted: true })
      const list = (byDate.get(key) || []).filter(e => inCourts(selectedCourt, e.court))
      list.forEach(e => {
        const title = narrow ? firstParty(e.caseTitle) : e.caseTitle
        const item = itemOf(e)
        const label = e.kind === 'misc' ? (roomy ? `${e.applicationType}: ${title}` : title) : item ? `${item}. ${title}` : title
        out.push({ key: e.key, label, colour: colourOf(e.court), leave: !!leaveForEntry(judgeLeaves, e), misc: e.kind === 'misc' })
      })
      return out
    }
    return Array.from({ length: rows }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(year, month, 1 - first + w * 7 + d)
        const key = dateKey(date)
        return { key, date, column: d, chips: chipsFor(key) }
      }),
    )
  }, [year, month, first, rows, byDate, holidayByDate, noHearing, judgeLeaves, selectedCourt, colourOf, narrow, roomy])

  return (
    <View style={{ width }}>
      {cells.map((week, w) => (
        <View key={w} style={[s.week, { height: rowHeight }]}>
          {week.map(c => (
            <DayCell
              key={`${w}-${c.column}`}
              k={c.key}
              day={c.date.getDate()}
              monthName={MONTHS[c.date.getMonth()]}
              startOfMonth={c.date.getDate() === 1}
              inMonth={c.date.getMonth() === month}
              isToday={c.key === today}
              isSelected={c.key === selected}
              chips={c.chips}
              capacity={capacity}
              roomy={roomy}
              chipH={chipH}
              onSelect={onSelectDate}
            />
          ))}
        </View>
      ))}
    </View>
  )
})

function MonthCalendar({ year, month, weekStart, byDate, holidayByDate, noHearing, judgeLeaves, selectedCourt, selected, colourOf, onSelectDate, onChangeMonth, onSwipeUp, refreshControl }: Props) {
  const s = useS()
  const [viewport, setViewport] = useState(0)
  const [width, setWidth] = useState(0)
  const cellW = width / 7
  const roomy = cellW >= ROOMY_CELL
  const first = monthOffset(year, month)
  const rows = Math.ceil((first + new Date(year, month + 1, 0).getDate()) / 7)
  const rowHeight = Math.max(MIN_ROW, viewport ? viewport / rows : MIN_ROW)

  const scrolls = viewport > 0 && rowHeight * rows > viewport + 1
  const pager = useMonthSlider(year * 12 + month, width, onChangeMonth, scrolls ? undefined : onSwipeUp)

  const names = weekdayNames().map(n => n.slice(0, 3))
  const shared = { width, viewport, weekStart, byDate, holidayByDate, noHearing, judgeLeaves, selectedCourt, selected, colourOf, onSelectDate }
  // Previous, current and next month, each at its own fixed place in the strip
  const months = [-1, 0, 1].map(d => {
    const date = new Date(year, month + d, 1)
    const y = date.getFullYear()
    const m = date.getMonth()
    return { y, m, n: y * 12 + m, rows: Math.ceil((monthOffset(y, m) + new Date(y, m + 1, 0).getDate()) / 7) }
  })
  const trackHeightValue = Math.max(...months.map(c => Math.max(MIN_ROW, viewport ? viewport / c.rows : MIN_ROW) * c.rows))

  const trackHeight = trackHeightValue
  const headStyle = useMemo(() => [s.headTrack, { width: width * (2 * MONTH_SPAN + 1), left: -MONTH_SPAN * width, transform: [{ translateX: pager.x }] }], [s, width, pager.x])
  const trackStyle = useMemo(() => [s.track, { width: width * (2 * MONTH_SPAN + 1), left: -MONTH_SPAN * width, height: trackHeight, transform: [{ translateX: pager.x }] }], [s, width, trackHeight, pager.x])

  return (
    <View style={s.wrap} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <View style={s.weekdays}>
        {width > 0 ? (
          <Animated.View {...pager.handlers} style={headStyle}>
            {months.map(c => (
              <View key={c.n} style={[s.headSlot, { width, left: pager.place(c.n) }]}>
                {names.map((l, i) => (
                  <View key={i} style={s.weekdayCell}>
                    <Text style={[s.weekday, roomy && s.weekdayRoomy]}>{l}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Animated.View>
        ) : null}
      </View>

      <ScrollView
        style={s.fill}
        refreshControl={refreshControl}
        onLayout={e => setViewport(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
        // The coloured edge glow that Android draws when a finger drifts up or down during a sideways swipe
        overScrollMode="never"
        directionalLockEnabled
      >
        {width > 0 ? (
          <Animated.View
            {...pager.handlers}
            style={trackStyle}
          >
            {months.map(c => (
              <View key={c.n} style={[s.slot, { width, left: pager.place(c.n) }]}>
                <MonthGrid year={c.y} month={c.m} {...shared} />
              </View>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg },
  fill: { flex: 1, overflow: 'hidden' },
  track: { flexShrink: 0 },
  slot: { position: 'absolute', top: 0 },
  weekdays: { height: 30, overflow: 'hidden' },
  headTrack: { height: '100%', flexShrink: 0 },
  headSlot: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  weekdayCell: { width: `${100 / 7}%`, height: '100%', alignItems: 'center', justifyContent: 'center' },
  weekday: { textAlign: 'center', ...font.dayName, fontWeight: '500', color: withAlpha(theme.ink, 0.82) },
  weekdayRoomy: { ...font.dayName },
  week: { flexDirection: 'row' },
  cell: { width: `${100 / 7}%`, height: '100%', padding: 1.5 },
  tile: { flex: 1, alignItems: 'stretch', paddingTop: 5, borderRadius: 6, backgroundColor: theme.card },
  cellHover: { backgroundColor: theme.hoverSoft },
  cellPressed: { backgroundColor: theme.hover },
  num: { alignSelf: 'center', minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  numSelected: { backgroundColor: theme.blueSoft },
  numTextSelected: { color: theme.brand, fontWeight: '700' },
  numToday: { backgroundColor: theme.brand },
  numText: { ...font.caption, fontVariant: font.digits, fontWeight: '500', color: theme.ink },
  numTextToday: { color: theme.onBrandFill, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, marginHorizontal: 1, borderRadius: 4, paddingHorizontal: 4, overflow: 'hidden', backgroundColor: theme.brand },
  chipMuted: { backgroundColor: theme.line },
  chipRoomy: { marginLeft: 0, marginRight: 6, paddingHorizontal: 8 },
  chipMisc: { paddingLeft: 9 },
  miscBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, opacity: 0.55 },
  chipOut: { opacity: 0.6 },
  chipText: { flexShrink: 1, ...font.micro, fontWeight: '500', color: theme.onBrand, includeFontPadding: false },
  chipTextRoomy: { ...font.caption, fontWeight: '600' },
  chipTextMuted: { color: theme.ink },
  more: { ...font.micro, fontWeight: '500', color: theme.muted, paddingHorizontal: 4 },
}))

export default React.memo(MonthCalendar)
