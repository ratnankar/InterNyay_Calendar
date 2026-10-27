import React, { useContext, useEffect, useState } from 'react'
import { useOnChange } from '../hooks'
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Text } from '../ui'
import { shareText } from '../share'
import { fetchHearingLeave } from '../api'
import { longDate, relativeLabel } from '../dates'
import { applicationFields, chequeFields, hearingFields } from '../hearings'
import { asHearingLeave, leaveForEntry, leaveNotice } from '../leave'
import { listNoOf, rememberListNos } from '../listNo'
import { useNotes } from '../NotesContext'
import { HearingEntry, HearingLeave, JudgeLeave } from '../types'
import { font, makeStyles, radius, readable, theme } from '../theme'
import DetailTable from './DetailTable'
import HistoryPanel from './HistoryPanel'
import Icon, { IconName } from './Icon'
import IconButton from './IconButton'
import Sheet from './Sheet'
import SheetScroll from './SheetScroll'
import { SheetDragContext } from './sheetDrag'
import Tappable from './Tappable'

interface Props {
  token: string
  entry: HearingEntry | null
  colour: string
  judgeLeaves: JudgeLeave[]
  onNote?: (e: HearingEntry, startNew?: boolean) => void
  onClose: () => void
}

function Row({ icon, title, sub, children }: { icon: IconName; title?: string; sub?: string; children?: React.ReactNode }) {
  const s = useS()
  if (!title && !children) return null
  return (
    <View style={s.row}>
      <View style={s.rowIcon}><Icon name={icon} size={22} color={theme.muted} /></View>
      <View style={s.rowBody}>
        {title ? <Text style={s.rowTitle}>{title}</Text> : null}
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
        {children}
      </View>
    </View>
  )
}

// The coloured top of the sheet takes part in the drag-down-to-close gesture owned by <Sheet>
function DragHead({ style, children }: { style: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const drag = useContext(SheetDragContext)
  return <View style={style} {...drag?.header}>{children}</View>
}

export default function EventSheet({ token, entry: e, colour, judgeLeaves, onNote, onClose }: Props) {
  const s = useS()
  const { notes } = useNotes()
  const [fetched, setFetched] = useState<{ key: string; leave: HearingLeave | undefined } | null>(null)
  const [note, setNote] = useState('')
  const caseId = e?.caseId
  const date = e?.date
  const leaveKey = `${date}:${caseId}`
  const leave = fetched?.key === leaveKey ? fetched.leave : undefined

  useOnChange(e?.key, () => setNote(''))
  useEffect(() => {
    if (!note) return
    const timer = setTimeout(() => setNote(''), 2200)
    return () => clearTimeout(timer)
  }, [note])

  useEffect(() => {
    if (date === undefined || caseId === undefined) return
    let live = true
    fetchHearingLeave(token, date)
      .then(rows => { rememberListNos(date, rows); if (live) setFetched({ key: `${date}:${caseId}`, leave: rows.find(r => r.caseId === caseId) }) })
      .catch(() => undefined)
    return () => { live = false }
  }, [token, caseId, date])

  const local = e ? leaveForEntry(judgeLeaves, e) : undefined
  const leaveNow: HearingLeave | undefined = leave?.onLeave ? leave : e && local ? { ...asHearingLeave(e, local), causeListNo: leave?.causeListNo } : leave
  const when = e ? longDate(e.date) : ''
  const rel = e ? relativeLabel(e.date) : ''
  const judge = leave?.judgeName || e?.judgeName
  const ink = readable(colour)
  const misc = e?.kind === 'misc'
  const disposedApp = !!e?.disposedOn || /^disposed/i.test(e?.applicationStatus || '')

  const listNo = misc ? undefined : leave?.causeListNo ?? (e ? listNoOf(e.caseId, e.date) : undefined)
  const badges = e ? [
    ...(misc ? [e.applicationStatus || 'Pending', e.applicationOutcome, 'Misc. application'] : [e.caseStatus, e.caseNature, e.reliefSought || e.caseType]),
    rel, !e.upcoming ? 'Heard' : '', note,
  ].filter((t, i, all): t is string => !!t && all.indexOf(t) === i) : []
  const caseNotes = e ? notes.filter(n => n.caseId === e.caseId).length : 0

  const share = async () => {
    if (!e) return
    const fields = (e.kind === 'misc' ? applicationFields(e) : hearingFields(e, { judge, listNo })).map(([l, v]) => `${l}: ${v}`)
    const cheque = e.kind === 'misc' ? [] : chequeFields(e).map(([l, v]) => `${l}: ${v}`)
    const text = [e.kind === 'misc' ? `${e.applicationType} (Misc. application)` : e.caseTitle, when, ...fields, ...cheque].filter(Boolean).join('\n')
    try {
      if (await shareText(text, { webShare: true }) === 'copied') setNote('Copied to clipboard')
    } catch { }
  }

  return (
    <Sheet visible={!!e} onClose={onClose} background={colour}>
      {e ? (
        <View style={s.fill}>
          <DragHead style={[s.head, { backgroundColor: colour }]}>
            <View style={s.column}>
              <View style={s.headRow}>
                <IconButton icon="close" label="Close" tone="plain" color={ink.ink} onPress={onClose} />
                <View style={s.fill} />
                <IconButton icon="share" label={Platform.OS === 'web' ? 'Copy hearing details' : 'Share hearing'} tone="plain" color={ink.ink} onPress={share} />
              </View>
              <Text style={[s.title, { color: ink.ink }]}>{misc ? e.applicationType : e.caseTitle}</Text>
              <Text style={[s.when, { color: ink.sub }]}>{when}</Text>
              <View style={s.tags}>
                {badges.map(t => <View key={t} style={s.tag}><Text style={[s.tagText, { color: ink.ink }]}>{t}</Text></View>)}
              </View>
            </View>
          </DragHead>

          <View style={s.body}>
          <SheetScroll contentContainerStyle={s.bodyContent}>
            {leaveNow?.onLeave ? (
              <View style={s.leave}>
                <Icon name="leave" size={20} color={theme.danger} />
                <Text style={s.leaveText}>{leaveNotice(leaveNow)}</Text>
              </View>
            ) : null}

            <View style={s.pad}>
              <DetailTable fields={misc ? applicationFields(e) : hearingFields(e, { judge, listNo })} />
              {misc ? null : <DetailTable title="Cheque Dishonour Details (Sec 138 NI Act)" fields={chequeFields(e)} />}
              <HistoryPanel
                items={misc ? e.applicationHearings : e.caseHistory}
                next={misc ? e.applicationNext : e.caseNext}
                showNext={!misc || !disposedApp}
                current={e.date}
              />
            </View>
            {e.outcome || e.notes ? (
              <Row icon="notes">
                {e.outcome ? <><Text style={s.label}>Outcome</Text><Text style={s.rowTitle}>{e.outcome}</Text></> : null}
                {e.notes ? <><Text style={[s.label, e.outcome ? s.labelGap : null]}>{misc ? 'Note for this hearing' : 'Notes'}</Text><Text style={s.rowTitle}>{e.notes}</Text></> : null}
              </Row>
            ) : null}
            {misc && e.applicationDocs.length > 0 ? (
              <Row icon="file" title={`Documents (${e.applicationDocs.length})`}>
                {e.applicationDocs.map((d, i) => (
                  <View key={`${d.kind}|${d.name}|${i}`} style={s.hist}>
                    <Text style={s.histDate}>{d.name}</Text>
                    <Text style={s.rowSub}>{[d.kind, d.size, d.date ? `Uploaded ${longDate(d.date)}` : ''].filter(Boolean).join(' · ')}</Text>
                  </View>
                ))}
                <Text style={[s.rowSub, s.labelGap]}>Open or download documents on the InterNyay website.</Text>
              </Row>
            ) : null}
            {onNote ? (
              <Tappable onPress={() => onNote(e, caseNotes === 0)} pressedScale={0.99} hoverStyle={s.rowHover} accessibilityRole="button" accessibilityLabel="Notes for this case" style={s.row}>
                <View style={s.rowIcon}><Icon name="note" size={22} color={theme.brand} /></View>
                <View style={s.rowBody}>
                  <Text style={s.noteLink}>Notes for this case</Text>
                  <Text style={s.rowSub}>{caseNotes ? `${caseNotes} note${caseNotes === 1 ? '' : 's'}` : 'Add a note'}</Text>
                </View>
              </Tappable>
            ) : null}
          </SheetScroll>
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  head: { paddingHorizontal: 8, paddingBottom: 22 },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  bodyContent: { padding: 0 },
  title: { ...font.eventTitle, fontWeight: '700', paddingHorizontal: 56, marginTop: 4, fontFamily: theme.display },
  when: { ...font.body, paddingHorizontal: 56, marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 56, marginTop: 10 },
  tag: { backgroundColor: theme.tagBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  tagText: { ...font.caption, fontWeight: '500' },
  body: { flex: 1, backgroundColor: theme.card },
  row: { flexDirection: 'row', paddingVertical: 14, paddingRight: 16, minHeight: 56 },
  rowHover: { backgroundColor: theme.hover },
  noteLink: { ...font.text, fontWeight: '600', color: theme.brand },
  rowIcon: { width: 56, alignItems: 'center', paddingTop: 1 },
  rowBody: { flex: 1 },
  rowTitle: { ...font.text, color: theme.ink },
  rowSub: { ...font.small, color: theme.muted, marginTop: 1 },
  label: { ...font.label, fontWeight: '500', color: theme.ink },
  labelGap: { marginTop: 10 },
  hist: { marginTop: 8 },
  histDate: { ...font.small, fontWeight: '600', color: theme.ink },
  leave: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.dangerSoft, paddingVertical: 12, paddingHorizontal: 18 },
  leaveText: { flex: 1, ...font.small, fontWeight: '500', color: theme.danger },
}))