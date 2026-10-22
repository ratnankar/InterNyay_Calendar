import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { addMonths, MONTHS, parseKey, stepYear, todayKey } from '../dates'
import { inCourts } from '../hearings'
import { HearingEntry } from '../types'
import { font, makeStyles, radius, theme } from '../theme'
import IconButton from './IconButton'
import Tappable from './Tappable'

interface Props {
  selected: string
  byDate: Map<string, HearingEntry[]>
  court: string[]
  onPick: (date: string) => void
}

const CHIP = 64
const GAP = 4

export default function MonthStrip({ selected, byDate, court, onPick }: Props) {
  const s = useS()
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const [viewport, setViewport] = useState(0)
  const sel = parseKey(selected)
  const year = sel.getFullYear()
  const today = parseKey(todayKey())

  const busy = useMemo(() => {
    const months = new Set<number>()
    byDate.forEach((list, key) => {
      if (key.startsWith(`${year}-`) && list.some(e => inCourts(court, e.court))) months.add(Number(key.slice(5, 7)) - 1)
    })
    return months
  }, [byDate, court, year])

  useEffect(() => {
    if (!viewport) return
    scroller.current?.scrollTo({ x: Math.max(0, sel.getMonth() * (CHIP + GAP) - viewport / 2 + CHIP / 2), animated: true })
  }, [viewport, year, sel.getMonth()]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.wrap}>
      <IconButton icon="chevronLeft" label={`Previous year, ${year - 1}`} tone="plain" size={36} onPress={() => onPick(stepYear(selected, -1))} />
      <Text style={s.year} accessibilityRole="header">{year}</Text>
      <IconButton icon="chevronRight" label={`Next year, ${year + 1}`} tone="plain" size={36} onPress={() => onPick(stepYear(selected, 1))} />

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.row}
        onLayout={e => setViewport(e.nativeEvent.layout.width)}
      >
        {MONTHS.map((name, m) => {
          const isSelected = m === sel.getMonth()
          const isNow = year === today.getFullYear() && m === today.getMonth()
          return (
            <Tappable
              key={name}
              onPress={() => onPick(addMonths(selected, m - sel.getMonth()))}
              pressedScale={0.95}
              hoverStyle={isSelected ? undefined : s.hover}
              accessibilityRole="button"
              accessibilityLabel={`${name} ${year}`}
              accessibilityState={{ selected: isSelected }}
              selected={isSelected}
              style={[s.chip, isSelected && s.chipOn, isNow && !isSelected && s.chipNow]}
            >
              <Text style={[s.month, isSelected && s.monthOn, isNow && !isSelected && s.monthNow]}>{name.slice(0, 3)}</Text>
              <View style={[s.dot, busy.has(m) && (isSelected ? s.dotOnSel : s.dotOn)]} />
            </Tappable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, gap: 2 },
  year: { ...font.label, fontWeight: '700', color: theme.ink, minWidth: 44, textAlign: 'center' },
  scroll: { flex: 1, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  chip: { width: CHIP, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  chipOn: { backgroundColor: theme.blueSoft },
  chipNow: { borderColor: theme.brand },
  hover: { backgroundColor: theme.hoverTint },
  month: { ...font.body, fontWeight: '500', color: theme.ink },
  monthOn: { color: theme.brand, fontWeight: '700' },
  monthNow: { color: theme.brand },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  dotOn: { backgroundColor: theme.muted },
  dotOnSel: { backgroundColor: theme.brand },
}))
