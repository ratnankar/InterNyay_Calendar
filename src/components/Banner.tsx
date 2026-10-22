import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { font, HOLIDAY_COLOURS, makeStyles, radius, theme } from '../theme'

interface Props {
  title: string
  lines?: string[]
  accent?: string
  tint?: string
  border?: string
  split?: boolean
}

export default function Banner({ title, lines = [], accent = theme.muted, tint = theme.card, border = theme.line, split }: Props) {
  const s = useS()
  return (
    <View style={[s.wrap, { backgroundColor: tint, borderColor: border }]}>
      {split ? (
        <View style={s.bar}>
          <View style={[s.half, { backgroundColor: HOLIDAY_COLOURS.DISTRICT.solid }]} />
          <View style={[s.half, { backgroundColor: HOLIDAY_COLOURS.HIGH.solid }]} />
        </View>
      ) : (
        <View style={[s.bar, { backgroundColor: accent }]} />
      )}
      <View style={s.body}>
        <Text style={[s.title, { color: split ? theme.ink : accent }]}>{title}</Text>
        {lines.map(l => <Text key={l} style={s.line}>{l}</Text>)}
      </View>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  bar: { width: 5 },
  half: { flex: 1 },
  body: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  title: { ...font.label, fontWeight: '700' },
  line: { ...font.small, color: theme.muted },
}))
