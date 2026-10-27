import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { HearingEntry, HearingLeave } from '../types'
import { applicationFields, badgesOf, chequeFields, hearingFields, roomOf } from '../hearings'
import { leaveNotice } from '../leave'
import { listNoOf } from '../listNo'
import { useNotes } from '../NotesContext'
import { cardShadow, font, makeStyles, radius, readable, theme, withAlpha } from '../theme'
import Chevron from './Chevron'
import DetailTable from './DetailTable'
import Expand from './Expand'
import HistoryPanel from './HistoryPanel'
import Icon from './Icon'
import Tappable from './Tappable'

type Value = string | number | null | undefined

const CHEQUE_TITLE = 'Cheque Dishonour Details (Sec 138 NI Act)'

function Line({ label, value }: { label: string; value: Value }) {
  const s = useS()
  if (value === undefined || value === null || value === '') return null
  return (
    <View style={s.line}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{String(value)}</Text>
    </View>
  )
}

interface Props {
  entry: HearingEntry
  colour: string
  leave?: HearingLeave
  highlighted?: boolean
  hideCourt?: boolean
  onNote?: (e: HearingEntry, startNew?: boolean) => void
}

function HearingCard({ entry: e, colour, leave, highlighted, hideCourt, onNote }: Props) {
  const s = useS()
  const { notes } = useNotes()
  const noteCount = useMemo(() => notes.reduce((n, x) => (x.caseId === e.caseId && !x.deleted ? n + 1 : n), 0), [notes, e.caseId])
  const [more, setMore] = useState(false)

  const misc = e.kind === 'misc'
  const hasResult = !!(e.outcome || e.notes)

  const listNo = misc ? undefined : leave?.causeListNo ?? listNoOf(e.caseId, e.date)
  const judge = leave?.judgeName || e.judgeName
  const badges = badgesOf(e)

  // Tapping the top of the card (or "More details") opens the details; tapping it again closes them
  const toggle = useCallback(() => setMore(v => !v), [])

  return (
    <View style={[s.card, highlighted && { borderColor: colour }]}>
      <View style={[s.bar, { backgroundColor: colour }]} />
      <View style={s.body}>
        {/* The whole top of the card is one tap target. It is not announced separately: screen readers use the
            "More details" button below, which does the same thing. */}
        <Tappable onPress={toggle} pressedScale={0.99} accessible={false}>
          <View style={s.top}>
            {hideCourt ? null : (
              <View style={[s.chip, { backgroundColor: colour }]}>
                <Text style={[s.chipText, { color: readable(colour).ink }]} numberOfLines={1}>{e.court}</Text>
              </View>
            )}
            {e.courtNo ? <Text style={s.courtNo}>Court No. {e.courtNo}</Text> : null}
            {misc ? <View style={s.miscTag}><Text style={s.miscTagText}>Misc. application</Text></View> : null}
            {!e.upcoming ? <Text style={s.heard}>Heard</Text> : null}
            {listNo ? <View style={s.listNo}><Text style={s.listNoText}>List no. {listNo}</Text></View> : null}
          </View>

          {misc ? (
            <>
              <Text style={s.title}>{e.applicationType}</Text>
              <Text style={s.caseNo}>Filed in: {[e.caseTitle, e.caseNo].filter(Boolean).join(' • ')}</Text>
            </>
          ) : (
            <>
              <Text style={s.title}>{e.caseTitle}</Text>
              {e.caseNo ? <Text style={s.caseNo}>{e.caseNo}</Text> : null}
            </>
          )}

          {leave?.onLeave ? (
            <View style={s.leave}>
              <Text style={s.leaveText}>{leaveNotice(leave)}</Text>
            </View>
          ) : null}

          <Expand open={!more}>
            <View style={s.details}>
              <Line label="Judge" value={judge} />
              <Line label="Room" value={roomOf(e)} />
              <Line label="Client" value={e.clientName} />
            </View>
          </Expand>
        </Tappable>

        {hasResult ? (
          <View style={[s.result, { backgroundColor: withAlpha(colour, 0.08), borderColor: withAlpha(colour, 0.3) }]}>
            <Line label="Outcome" value={e.outcome} />
            <Line label={misc ? 'Hearing note' : 'Notes'} value={e.notes} />
          </View>
        ) : null}

        <Expand open={more}>
          <View style={s.full}>
            {badges.length ? <View style={s.badges}>{badges.map(t => <View key={t} style={s.badge}><Text style={s.badgeText}>{t}</Text></View>)}</View> : null}
            <DetailTable fields={misc ? applicationFields(e) : hearingFields(e, { judge, listNo })} />
            {misc ? null : <DetailTable title={CHEQUE_TITLE} fields={chequeFields(e)} />}
            <HistoryPanel
              items={misc ? e.applicationHearings : e.caseHistory}
              next={misc ? e.applicationNext : e.caseNext}
              showNext={!misc || !!e.applicationNext || !e.disposedOn}
              current={e.date}
            />
          </View>
        </Expand>

        <View style={s.actions}>
          <Tappable onPress={toggle} pressedScale={0.96} accessibilityRole="button" accessibilityState={{ expanded: more }} style={s.more}>
            <Text style={s.moreText}>{more ? 'Show less' : 'More details'}</Text>
            <Chevron open={more} size={16} color={theme.brand} />
          </Tappable>
          {onNote ? (
            <Tappable onPress={() => onNote(e, noteCount === 0)} pressedScale={0.96} accessibilityRole="button" accessibilityLabel="Notes for this case" style={s.more}>
              <Icon name="note" size={16} color={theme.brand} />
              <Text style={s.moreText}>{noteCount ? `Notes (${noteCount})` : 'Add note'}</Text>
            </Tappable>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: theme.line, overflow: 'hidden', marginBottom: 12, ...cardShadow },
  bar: { width: 6 },
  body: { flex: 1, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, maxWidth: '60%' },
  chipText: { ...font.caption, fontWeight: '700' },
  courtNo: { ...font.caption, color: theme.muted },
  miscTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.line },
  miscTagText: { ...font.caption, fontWeight: '700', color: theme.ink },
  heard: { ...font.micro, color: theme.muted, borderWidth: 1, borderColor: theme.line, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  listNo: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.line },
  listNoText: { ...font.caption, fontVariant: font.digits, fontWeight: '700', color: theme.ink },
  title: { ...font.title, fontWeight: '700', color: theme.ink },
  caseNo: { ...font.small, color: theme.muted, marginTop: 2 },
  leave: { backgroundColor: theme.dangerSoft, borderRadius: 8, padding: 8, marginTop: 8 },
  leaveText: { color: theme.danger, ...font.captionLong, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.line },
  badgeText: { ...font.caption, fontWeight: '600', color: theme.ink },
  full: { marginTop: 10 },
  details: { marginTop: 10, gap: 5 },
  line: { flexDirection: 'row' },
  label: { width: 96, flexShrink: 0, ...font.captionLong, color: theme.muted },
  value: { flex: 1, minWidth: 0, ...font.small, color: theme.ink },
  result: { marginTop: 10, borderRadius: radius.sm, borderWidth: 1, padding: 10, gap: 5 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 18, marginTop: 8 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  moreText: { ...font.small, fontWeight: '700', color: theme.brand },
}))

export default React.memo(HearingCard)
