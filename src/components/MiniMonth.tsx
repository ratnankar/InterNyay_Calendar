import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { dateKey, MONTHS, monthOffset, parseKey, sundayColumn, todayKey, weekdayLetters } from '../dates'
import { inCourts } from '../hearings'
import { useMonthPager } from '../motion'
import { HearingEntry } from '../types'
import { font, makeStyles, theme } from '../theme'
import IconButton from './IconButton'

interface Props {
  base: string
  selected: string
  byDate: Map<string, HearingEntry[]>
  court: string[]
  onPick: (date: string) => void
  onStep: (delta: number) => void
}

export default function MiniMonth({ base, selected, byDate, court, onPick, onStep }: Props) {
  const s = useS()
  const d = parseKey(base)
  const year = d.getFullYear()
  const month = d.getMonth()
  const first = monthOffset(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rows = Math.ceil((first + daysInMonth) / 7)
  const today = todayKey()

  const pager = useMonthPager(year * 12 + month, onStep, undefined, 40)

  const has = (key: string) => (byDate.get(key) || []).some(e => inCourts(court, e.court))

  return (
    <View style={s.wrap} {...pager.handlers}>
      <View style={s.head}>
        <Text style={s.title}>{MONTHS[month]} {year}</Text>
        <IconButton icon="chevronLeft" label="Previous month" tone="plain" size={32} onPress={() => onStep(-1)} />
        <IconButton icon="chevronRight" label="Next month" tone="plain" size={32} onPress={() => onStep(1)} />
      </View>
      <Animated.View style={pager.style}>
        <View style={s.row}>
          {weekdayLetters().map((l, i) => <Text key={i} style={[s.letter, i === sundayColumn() && s.letterSunday]}>{l}</Text>)}
        </View>
        {Array.from({ length: rows }, (_, w) => (
          <View key={w} style={s.row}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(year, month, 1 - first + w * 7 + i)
              const key = dateKey(date)
              const inMonth = date.getMonth() === month
              const isToday = key === today
              const isSel = key === selected
              return (
                <Pressable key={key} onPress={() => onPick(key)} accessibilityRole="button" accessibilityLabel={`${date.getDate()} ${MONTHS[date.getMonth()]}`} style={s.cell}>
                  <View style={[s.num, isSel && !isToday && s.numSel, isToday && s.numToday]}>
                    <Text style={[s.numText, !inMonth && s.numOut, date.getDay() === 0 && inMonth && s.numSunday, isSel && !isToday && s.numTextSel, isToday && s.numTextToday]}>{date.getDate()}</Text>
                  </View>
                  <View style={[s.dot, has(key) && (isToday ? s.dotOnToday : s.dotOn)]} />
                </Pressable>
              )
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', height: 40, paddingLeft: 8, paddingRight: 0 },
  title: { flex: 1, ...font.label, fontWeight: '500', color: theme.ink },
  row: { flexDirection: 'row' },
  letter: { width: `${100 / 7}%`, textAlign: 'center', ...font.weekday, fontWeight: '500', color: theme.muted },
  cell: { width: `${100 / 7}%`, height: 34, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numToday: { backgroundColor: theme.brand },
  numSel: { backgroundColor: theme.blueSoft },
  numText: { ...font.caption, fontVariant: font.digits, fontWeight: '400', color: theme.ink },
  numOut: { color: theme.faint },
  numSunday: { color: theme.sunday },
  letterSunday: { color: theme.sunday },
  numTextToday: { color: theme.onBrandFill, fontWeight: '500' },
  numTextSel: { color: theme.brand, fontWeight: '500' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 0 },
  dotOn: { backgroundColor: theme.muted },
  dotOnToday: { backgroundColor: theme.brand },
}))
