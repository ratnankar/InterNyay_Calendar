import { memo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../ui'
import { leaveRange } from '../leave'
import { font, makeStyles, radius, theme, withAlpha } from '../theme'
import { itemLabel } from '../listNo'
import { HearingEntry, JudgeLeave } from '../types'
import { stagger } from '../motion'
import Icon from './Icon'
import IconButton from './IconButton'
import Reveal from './Reveal'
import Tappable from './Tappable'

export interface LeaveItem {
  leave: JudgeLeave
  cases: HearingEntry[]
}

interface ChipsProps {
  courts: string[]
  value: string[]
  onChange: (value: string[]) => void
  colourOf: (court: string) => string
}

export function CourtChips({ courts, value, onChange, colourOf }: ChipsProps) {
  const s = useS()
  const all = value.length === 0
  const pick = (c: string) => onChange(value.length === 1 && value[0] === c ? [] : [c])
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipRow}>
      <Tappable
        onPress={() => onChange([])}
        pressedScale={0.96}
        accessibilityRole="button"
        accessibilityState={{ selected: all }}
        accessibilityLabel="All courts"
        selected={all}
        style={[s.chip, all && s.chipAllOn]}
      >
        <Text style={[s.chipText, all && s.chipAllText]}>All</Text>
      </Tappable>
      {courts.map(c => {
        const on = value.includes(c)
        return (
          <Tappable
            key={c}
            onPress={() => pick(c)}
            pressedScale={0.96}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c}
            selected={on}
            style={[s.chip, on && { backgroundColor: withAlpha(colourOf(c), 0.12), borderColor: colourOf(c) }]}
          >
            <View style={[s.dot, { backgroundColor: colourOf(c) }]} />
            <Text style={s.chipText} numberOfLines={1}>{c}</Text>
          </Tappable>
        )
      })}
    </ScrollView>
  )
}

interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}

// The search box above the leave lists (judge name, court, district or reason)
export function LeaveSearch({ value, onChange, placeholder, label }: SearchProps) {
  const s = useS()
  return (
    <View style={s.searchRow}>
      <Icon name="search" size={20} color={theme.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        autoComplete="off"
        autoCorrect={false}
        returnKeyType="search"
        style={s.input}
        accessibilityLabel={label}
      />
      {value ? <IconButton icon="close" label="Clear search" tone="plain" size={32} onPress={() => onChange('')} /> : null}
    </View>
  )
}

const LeaveRow = memo(function LeaveRow({ leave: l, cases, index, instant }: LeaveItem & { index: number; instant: boolean }) {
  const s = useS()
  const titles = [...new Set(cases.map(itemLabel))]
  const where = [l.court, l.district && !(l.court || '').includes(l.district) ? l.district : ''].filter(Boolean).join(', ')
  return (
    <Reveal delay={stagger(index)} skip={instant}>
      <View style={s.row}>
        <Text style={s.name}>{l.name}</Text>
        <Text style={s.sub}>{[where, leaveRange(l), l.reason].filter(Boolean).join(' · ')}</Text>
        {titles.length ? <Text style={s.cases}>Your case{titles.length === 1 ? '' : 's'}: {titles.join(', ')}</Text> : null}
      </View>
    </Reveal>
  )
})

// instant: rows appear at once without the slide-in (used when the list is replaced by another day, where
// animating dozens of rows is what made changing the date feel slow)
export function LeaveRows({ items, instant = false }: { items: LeaveItem[]; instant?: boolean }) {
  return (
    <>
      {items.map(({ leave: l, cases }, index) => (
        <LeaveRow key={`${l.name}-${l.court}-${l.leaveFrom}-${l.leaveTo}`} leave={l} cases={cases} index={index} instant={instant} />
      ))}
    </>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  chipScroll: { flexGrow: 0 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line, maxWidth: 240 },
  chipAllOn: { backgroundColor: theme.blueSoft, borderColor: theme.brand },
  chipText: { flexShrink: 1, ...font.small, fontWeight: '500', color: theme.ink },
  chipAllText: { color: theme.brand },
  dot: { width: 10, height: 10, borderRadius: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, marginHorizontal: 16, marginBottom: 6, paddingLeft: 12, paddingRight: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line },
  input: { flex: 1, height: 40, ...font.body, color: theme.ink },
  row: { gap: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  name: { ...font.body, fontWeight: '700', color: theme.ink },
  sub: { ...font.captionLong, color: theme.muted },
  cases: { ...font.captionLong, fontWeight: '600', color: theme.danger },
}))
