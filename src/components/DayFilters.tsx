import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { HearingEntry } from '../types'
import { font, makeStyles, radius, theme } from '../theme'
import Tappable from './Tappable'

interface Option { value: string; count: number }

// Distinct values with how many hearings have them. Values that differ only in letter case are one value
function tally(values: string[][]): Option[] {
  const m = new Map<string, Option>()
  values.forEach(list => list.forEach(v => {
    const k = v.toLowerCase()
    const o = m.get(k)
    if (o) o.count++
    else m.set(k, { value: v, count: 1 })
  }))
  return [...m.values()]
}

interface Props {
  entries: HearingEntry[]
  colourOf: (court: string) => string
  court: string | null
  onCourt: (v: string | null) => void
}

function Row({ label, options, value, onChange, total, colourOf }: {
  label: string
  options: Option[]
  value: string | null
  onChange: (v: string | null) => void
  total: number
  colourOf?: (v: string) => string
}) {
  const s = useS()
  // One court on the day leaves nothing to choose
  if (options.length < 2) return null
  const chip = (key: string, text: string, count: number, on: boolean, onPress: () => void, dot?: string) => (
    <Tappable key={key} onPress={onPress} selected={on} pressedScale={0.95} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${label}: ${text}`} style={[s.chip, on && s.chipOn]}>
      {dot ? <View style={[s.dot, { backgroundColor: dot }]} /> : null}
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{text}</Text>
      <Text style={[s.count, on && s.chipTextOn]}>{count}</Text>
    </Tappable>
  )
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {chip('all', 'All', total, value === null, () => onChange(null))}
        {options.map(o => chip(o.value, o.value, o.count, value !== null && value.toLowerCase() === o.value.toLowerCase(), () => onChange(o.value), colourOf?.(o.value)))}
      </ScrollView>
    </View>
  )
}

// Court chips at the top of a day
export default function DayFilters({ entries, colourOf, court, onCourt }: Props) {
  const s = useS()
  const courts = useMemo(() => tally(entries.map(e => (e.court ? [e.court] : []))), [entries])
  return (
    <View style={s.wrap}>
      <Row label="Courts" options={courts} value={court} onChange={onCourt} total={entries.length} colourOf={colourOf} />
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { gap: 10, marginBottom: 14 },
  row: { gap: 4 },
  label: { ...font.micro, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.line },
  chipOn: { backgroundColor: theme.brand, borderColor: theme.brand },
  chipText: { flexShrink: 1, ...font.caption, fontWeight: '600', color: theme.ink },
  chipTextOn: { color: theme.onBrand },
  count: { ...font.caption, fontVariant: font.digits, fontWeight: '700', color: theme.muted },
  dot: { width: 9, height: 9, borderRadius: 5 },
}))
