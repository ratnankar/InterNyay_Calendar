import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { fullDate } from '../dates'
import { HistoryItem } from '../types'
import { font, makeStyles, theme } from '../theme'
import Expand from './Expand'
import Chevron from './Chevron'
import Tappable from './Tappable'

interface Props {
  items: HistoryItem[]
  next?: string
  showNext?: boolean
  current?: string
  defaultOpen?: boolean
}

export default function HistoryPanel({ items, next, showNext = true, current, defaultOpen = false }: Props) {
  const s = useS()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Tappable onPress={() => setOpen(v => !v)} pressedScale={0.98} accessibilityRole="button" accessibilityState={{ expanded: open }}
          accessibilityLabel={`Hearing history, ${items.length} ${items.length === 1 ? 'entry' : 'entries'}`} style={s.toggle}>
          <Chevron open={open} name="chevronRight" openDeg={90} size={18} color={theme.muted} />
          <Text style={s.toggleText}>Hearing History{items.length > 0 ? ` (${items.length})` : ''}</Text>
        </Tappable>
        {showNext ? (
          <View style={s.next}>
            <Text style={s.nextLabel}>Next Hearing</Text>
            <Text style={s.nextDate}>{next ? fullDate(next) : '—'}</Text>
          </View>
        ) : null}
      </View>

      <Expand open={open}>
        {items.length === 0 ? (
          <Text style={s.empty}>No hearing dates recorded yet.</Text>
        ) : (
          <View style={s.list}>
            {items.map(h => (
              <View key={h.date} style={s.item}>
                <Text style={[s.date, h.date === current && s.here]}>
                  {fullDate(h.date)}{h.date === current ? ' · this hearing' : showNext && h.date === next ? ' · next' : ''}
                </Text>
                <Text style={[s.note, !h.note && s.noNote]}>{h.note || 'No note for this date'}</Text>
              </View>
            ))}
          </View>
        )}
      </Expand>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { marginTop: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  toggleText: { ...font.small, fontWeight: '700', color: theme.muted },
  next: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  nextLabel: { ...font.caption, color: theme.muted },
  nextDate: { ...font.small, fontWeight: '700', color: theme.ink },
  list: { marginTop: 4, gap: 8, paddingLeft: 20 },
  item: { gap: 1 },
  date: { ...font.small, fontWeight: '600', color: theme.ink },
  here: { color: theme.brand },
  note: { ...font.small, color: theme.muted },
  noNote: { color: theme.faint },
  empty: { ...font.body, color: theme.muted, paddingLeft: 20, paddingVertical: 4 },
}))
