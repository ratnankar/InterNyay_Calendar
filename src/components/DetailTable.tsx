import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { Field } from '../hearings'
import { font, makeStyles, radius, theme } from '../theme'

const TWO_COLUMNS = 560

interface Props {
  fields: Field[]
  mono?: string[]
}

export default function DetailTable({ fields, mono = ['CNR No'] }: Props) {
  const s = useS()
  const [width, setWidth] = useState(0)
  const pairs = width >= TWO_COLUMNS ? 2 : 1
  const rows: Field[][] = []
  for (let i = 0; i < fields.length; i += pairs) rows.push(fields.slice(i, i + pairs))
  if (rows.length === 0) return null

  return (
    <View style={s.table} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {rows.map((row, r) => (
        <View key={row[0][0]} style={[s.row, r > 0 && s.rowLine]}>
          {row.map(([label, value], i) => (
            <View key={label} style={[s.pair, i > 0 && s.pairLine]}>
              <View style={s.labelCell}><Text style={s.label}>{label}</Text></View>
              <View style={s.valueCell}><Text style={[s.value, mono.includes(label) && s.mono]} selectable>{value}</Text></View>
            </View>
          ))}

          {row.length < pairs ? <View style={[s.pair, s.pairLine, s.pairBlank]} /> : null}
        </View>
      ))}
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  table: { borderWidth: 1, borderColor: theme.line, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: theme.card },
  row: { flexDirection: 'row' },
  rowLine: { borderTopWidth: 1, borderTopColor: theme.line },
  pair: { flex: 1, flexDirection: 'row', minWidth: 0 },
  pairLine: { borderLeftWidth: 1, borderLeftColor: theme.line },
  pairBlank: { backgroundColor: theme.card },
  labelCell: { width: 124, backgroundColor: theme.brandSoft, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  valueCell: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  label: { ...font.label, fontWeight: '500', color: theme.ink },
  value: { ...font.small, color: theme.ink },
  mono: { fontFamily: theme.mono },
}))
