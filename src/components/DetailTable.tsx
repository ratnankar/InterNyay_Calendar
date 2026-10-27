import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { Field } from '../hearings'
import { font, makeStyles, radius, theme } from '../theme'

const TWO_COLUMNS = 560

interface Props {
  fields: Field[]
  mono?: string[]
  title?: string
}

const isWide = ([label, value]: Field) => label === 'Description' || value.includes('\n')

interface Line {
  fields: Field[]
  wide: boolean
}

export default function DetailTable({ fields, mono = ['CNR No'], title }: Props) {
  const s = useS()
  const [width, setWidth] = useState(0)
  const pairs = width >= TWO_COLUMNS ? 2 : 1
  const rows: Line[] = []
  let pending: Field[] = []
  const flush = () => {
    if (pending.length) rows.push({ fields: pending, wide: false })
    pending = []
  }
  for (const f of fields) {
    if (isWide(f)) {
      flush()
      rows.push({ fields: [f], wide: true })
    } else {
      pending.push(f)
      if (pending.length === pairs) flush()
    }
  }
  flush()
  if (rows.length === 0) return null

  return (
    <View>
      {title ? <Text style={s.title}>{title}</Text> : null}
      <View style={s.table} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {rows.map((row, r) => (
          <View key={row.fields[0][0]} style={[s.row, r > 0 && s.rowLine]}>
            {row.fields.map(([label, value], i) => (
              <View key={label} style={[s.pair, i > 0 && s.pairLine]}>
                <View style={s.labelCell}><Text style={s.label}>{label}</Text></View>
                {/* Only the CNR number can be selected for copying: on Android a selectable text takes over the touch, so a drag that
                    starts on it would not scroll the list */}
                <View style={s.valueCell}><Text style={[s.value, mono.includes(label) && s.mono]} selectable={mono.includes(label)}>{value}</Text></View>
              </View>
            ))}

            {!row.wide && row.fields.length < pairs ? <View style={[s.pair, s.pairLine, s.pairBlank]} /> : null}
          </View>
        ))}
      </View>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  title: { ...font.label, fontWeight: '700', color: theme.ink, marginTop: 14, marginBottom: 6 },
  table: { borderWidth: 1, borderColor: theme.line, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: theme.card },
  row: { flexDirection: 'row' },
  rowLine: { borderTopWidth: 1, borderTopColor: theme.line },
  pair: { flex: 1, flexDirection: 'row', minWidth: 0 },
  pairLine: { borderLeftWidth: 1, borderLeftColor: theme.line },
  pairBlank: { backgroundColor: theme.card },
  labelCell: { width: 112, backgroundColor: theme.brandSoft, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  valueCell: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  label: { ...font.small, fontWeight: '600', color: theme.ink },
  value: { ...font.small, color: theme.ink },
  mono: { fontFamily: theme.mono },
}))