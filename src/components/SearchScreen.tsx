import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FlatList, Modal, Platform, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Text, TextInput } from '../ui'
import { dayLabel, todayKey } from '../dates'
import { countLabel } from '../hearings'
import { listNoOf, loadListNos } from '../listNo'
import { HearingEntry, JudgeLeave } from '../types'
import { font, makeStyles, readable, theme } from '../theme'
import EventSheet from './EventSheet'
import { stagger } from '../motion'
import IconButton from './IconButton'
import Reveal from './Reveal'
import Tappable from './Tappable'

interface Props {
  visible: boolean
  token: string
  entries: HearingEntry[]
  judgeLeaves: JudgeLeave[]
  colourOf: (court: string) => string
  onNote: (e: HearingEntry, startNew?: boolean) => void
  onClose: () => void
}

const haystack = (e: HearingEntry) =>
  [e.caseTitle, e.caseNo, e.clientName, e.opposingParty, e.court, e.courtNo, e.judgeName, e.cnrNo, e.fileNo, e.caseType, e.caseNature,
    e.reliefSought, e.clientLabel, e.caseStatus,
    ...e.caseHistory.map(h => h.note),

    ...(e.kind === 'misc' ? [e.applicationType, e.applicationStatus, e.applicationOutcome, 'misc miscellaneous application', e.notes,
      ...e.applicationHearings.map(h => h.note), ...e.applicationDocs.map(d => d.name)] : [])].join(' ').toLowerCase()

interface IndexRow { e: HearingEntry; h: string }
const indexes = new WeakMap<HearingEntry[], IndexRow[]>()

function indexOf(entries: HearingEntry[]) {
  let rows = indexes.get(entries)
  if (!rows) {
    rows = entries.map(e => ({ e, h: haystack(e) }))
    indexes.set(entries, rows)
  }
  return rows
}

export default function SearchScreen({ visible, token, entries, judgeLeaves, colourOf, onNote, onClose }: Props) {
  const s = useS()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<HearingEntry | null>(null)
  const [, setListNosLoaded] = useState(0)

  if (!visible && (q || open)) { setQ(''); setOpen(null) }

  // The searchable text of every entry is built once per data load (on the first search), not on every keystroke,
  // and the list follows the typing a moment later so the keyboard never waits for it
  const query = useDeferredValue(q)

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    const today = todayKey()
    const hit = indexOf(entries).filter(r => terms.every(t => r.h.includes(t))).map(r => r.e)

    const upcoming = hit.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
    const past = hit.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date))
    return [...upcoming, ...past].slice(0, 120)
  }, [query, entries])

  useEffect(() => {
    const dates = [...new Set<string>(results.slice(0, 30).filter(e => e.kind === 'hearing').map(e => e.date))].slice(0, 12)
    if (!dates.length) return
    let live = true
    loadListNos(token, dates).then(changed => { if (live && changed) setListNosLoaded(n => n + 1) })
    return () => { live = false }
  }, [results, token])

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider>
        <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
          <View style={s.bar}>
            <IconButton icon="back" label="Close search" tone="plain" onPress={onClose} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search cases, applications, clients, courts"
              autoComplete="off"
              placeholderTextColor={theme.faint}
              autoFocus
              returnKeyType="search"
              autoCorrect={false}
              style={s.input}
              accessibilityLabel="Search hearings and applications"
            />
            {q ? <IconButton icon="close" label="Clear search" tone="plain" onPress={() => setQ('')} /> : null}
          </View>

          <FlatList
            data={results}
            contentContainerStyle={s.list}
            keyExtractor={e => e.key}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={results.length ? <Text style={s.count}>{results.length === 120 ? 'Showing the first 120 matches' : `${countLabel(results)} found`}</Text> : undefined}
            ListEmptyComponent={
              <Text style={s.empty}>{q.trim() ? 'No hearings or applications match your search.' : 'Search by case title, case no., client, opposite party, court, judge or application.'}</Text>
            }
            renderItem={({ item: e, index }) => {
              const prev = results[index - 1]
              const dateHeader = !prev || prev.date !== e.date
              const ink = readable(colourOf(e.court))
              const row = (
                <View>
                  {dateHeader ? <Text style={[s.date, e.date < todayKey() && s.datePast]}>{dayLabel(e.date)}, {e.date.slice(0, 4)}</Text> : null}
                  <Tappable onPress={() => setOpen(e)} pressedScale={0.99} accessibilityRole="button" containerStyle={s.slot} style={[s.card, { backgroundColor: colourOf(e.court) }]}>
                    <Text style={[s.cardTitle, { color: ink.ink }]} numberOfLines={2}>{e.kind === 'misc' ? `${e.applicationType} · ${e.caseTitle}` : e.caseTitle}</Text>
                    <Text style={[s.cardSub, { color: ink.sub }]} numberOfLines={1}>
                      {[e.kind === 'misc' ? 'Misc. application' : '', e.court, e.courtNo ? `Court ${e.courtNo}` : '', e.kind === 'hearing' && listNoOf(e.caseId, e.date) ? `List ${listNoOf(e.caseId, e.date)}` : '', e.caseNo].filter(Boolean).join(', ')}
                    </Text>
                  </Tappable>
                </View>
              )
              return index < 10 ? <Reveal delay={stagger(index)}>{row}</Reveal> : row
            }}
          />
        </SafeAreaView>
        <EventSheet token={token} entry={open} colour={open ? colourOf(open.court) : theme.brand} judgeLeaves={judgeLeaves} onNote={onNote} onClose={() => setOpen(null)} />
      </SafeAreaProvider>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.card },
  bar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: theme.line },
  input: { flex: 1, height: 44, ...font.entry, color: theme.ink, paddingHorizontal: 8, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) } as object,
  list: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 24 },
  count: { ...font.caption, fontVariant: font.digits, color: theme.muted, paddingHorizontal: 16, paddingTop: 12 },
  empty: { textAlign: 'center', color: theme.muted, ...font.body, marginTop: 64, paddingHorizontal: 32 },
  date: { ...font.small, fontWeight: '500', color: theme.brand, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  datePast: { color: theme.muted },
  slot: { marginHorizontal: 16, marginBottom: 6 },
  card: { borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  cardTitle: { ...font.body, fontWeight: '500' },
  cardSub: { ...font.caption, marginTop: 1 },
}))
