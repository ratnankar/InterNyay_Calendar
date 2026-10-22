import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { fetchHearingLeave } from '../api'
import { longDate, parseKey, relativeLabel } from '../dates'
import { countLabel, noCourtSelected } from '../hearings'
import { useLayout } from '../layout'
import { rememberListNos } from '../listNo'
import { animateLayout, useSlideIn } from '../motion'
import { asHearingLeave, leaveForEntry } from '../leave'
import { holidayCourtLabel, holidayCourtOf } from '../holidays'
import { HearingEntry, HearingLeave, Holiday, JudgeLeave } from '../types'
import { font, HOLIDAY_COLOURS, makeStyles, radius, theme, withAlpha } from '../theme'
import Banner from './Banner'
import DayFilters from './DayFilters'
import LeaveSlider, { HANDLE_HEIGHT } from './LeaveSlider'
import HearingCard from './HearingCard'
import Reveal from './Reveal'
import Sheet from './Sheet'
import SheetHeader from './SheetHeader'
import SheetScroll from './SheetScroll'

interface Props {
  token: string
  date: string | null
  entries: HearingEntry[]
  holiday?: Holiday
  noHearing?: boolean
  judgeLeaves: JudgeLeave[]
  courts: string[]
  selectedCourt: string[]
  colourOf: (court: string) => string
  onNote: (e: HearingEntry, startNew?: boolean) => void
  onClose: () => void
  onStep: (delta: number) => void
}

function HolidayBanner({ holiday }: { holiday: Holiday }) {
  const c = holidayCourtOf(holiday)
  const colour = c === 'DISTRICT' ? HOLIDAY_COLOURS.DISTRICT : c === 'HIGH' ? HOLIDAY_COLOURS.HIGH : null
  const lines = [`${holidayCourtLabel(holiday)} holiday`, ...(holiday.description ? [holiday.description] : [])]
  return colour
    ? <Banner title={holiday.label} lines={lines} accent={colour.solid} tint={colour.soft} border={colour.border} />
    : <Banner title={holiday.label} lines={lines} split />
}

function SectionHeader({ colour, label, count }: { colour: string; label: string; count: number }) {
  const s = useS()
  return (
    <View style={s.sectionRow}>
      <View style={[s.swatch, { backgroundColor: colour }]} />
      <Text style={s.section} numberOfLines={1}>{label}</Text>
      <View style={s.count}><Text style={s.countText}>{count}</Text></View>
    </View>
  )
}

function DayLeaveBar({ date, open, onOpenChange, entries, leaves, courts, selectedCourt, colourOf }: {
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: HearingEntry[]
  leaves: JudgeLeave[]
  courts: string[]
  selectedCourt: string[]
  colourOf: (court: string) => string
}) {
  const insets = useSafeAreaInsets()
  const { dialog } = useLayout()
  const bottomInset = dialog ? 0 : insets.bottom
  return (
    <>
      <View style={{ height: HANDLE_HEIGHT + bottomInset }} />
      <LeaveSlider
        open={open} onOpenChange={onOpenChange} date={date} scope="day" bottomInset={bottomInset}
        leaves={leaves} entries={entries} courts={courts} selectedCourt={selectedCourt} colourOf={colourOf}
      />
    </>
  )
}

export default function DateSheet({ token, date, entries, holiday, noHearing, judgeLeaves, courts, selectedCourt, colourOf, onNote, onClose, onStep }: Props) {
  const s = useS()
  const [leave, setLeave] = useState<Record<number, HearingLeave>>({})
  const [leaveOpen, setLeaveOpen] = useState(false)
  // Court chip at the top of the day (null = All). It only narrows the list of this sheet
  const [fCourt, setFCourt] = useState<string | null>(null)
  const slide = useSlideIn(date ? Math.round(parseKey(date).getTime() / 86400000) : 0, 0.3)

  useEffect(() => {
    if (date) return
    setLeaveOpen(false)
    setFCourt(null)
  }, [date])

  // Opening the sheet cascades the cards in. Stepping to the next day already slides the list, so the cards just show
  const shownDate = useRef<string | null>(null)
  const stepping = !!date && !!shownDate.current && shownDate.current !== date
  useEffect(() => { shownDate.current = date }, [date])

  useEffect(() => {
    setLeave({})
    if (!date || entries.length === 0) return
    let live = true
    fetchHearingLeave(token, date)
      .then(rows => { rememberListNos(date, rows); if (live) setLeave(Object.fromEntries(rows.map(r => [r.caseId, r]))) })
      .catch(() => undefined)
    return () => { live = false }
  }, [token, date, entries.length])

  const leaveOf = (e: HearingEntry): HearingLeave | undefined => {
    const sv = leave[e.caseId]
    if (sv?.onLeave) return sv
    const l = leaveForEntry(judgeLeaves, e)
    return l ? { ...asHearingLeave(e, l), causeListNo: sv?.causeListNo } : sv
  }

  // A chip chosen on another day that this day does not have counts as All
  const court = fCourt && entries.some(e => e.court === fCourt) ? fCourt : null

  const shown = useMemo(() => (court ? entries.filter(e => e.court === court) : entries), [entries, court])

  const { mine, others } = useMemo(() => {
    if (selectedCourt.length === 0) return { mine: [] as HearingEntry[], others: shown }
    return {
      mine: shown.filter(e => selectedCourt.includes(e.court)),
      others: shown.filter(e => !selectedCourt.includes(e.court)),
    }
  }, [shown, selectedCourt])

  const groupOf = (list: HearingEntry[]) => {
    const g = new Map<string, HearingEntry[]>()
    list.forEach(e => g.set(e.court, [...(g.get(e.court) || []), e]))
    return [...g.entries()]
  }
  const mineGroups = useMemo(() => groupOf(mine), [mine])
  const otherGroups = useMemo(() => groupOf(others), [others])

  const isSunday = !!date && parseKey(date).getDay() === 0
  let order = 0
  const next = () => 120 + Math.min(order++, 6) * 55

  return (
    <Sheet visible={!!date} onClose={onClose}>
      <SheetHeader
        title={date ? longDate(date) : ''}
        subtitle={countLabel(shown)}
        badge={date ? relativeLabel(date) || undefined : undefined}
        onClose={onClose}
        onPrev={() => onStep(-1)}
        onNext={() => onStep(1)}
      />
      <View style={s.body}>
        <Animated.View style={[s.body, slide]}>
          <SheetScroll>
            {holiday ? <HolidayBanner holiday={holiday} /> : null}
            {isSunday ? (
              <Banner
                title="Sunday"
                lines={['Courts do not sit on Sunday, no hearings are set.']}
                accent={theme.sunday}
                tint={withAlpha(theme.sunday, 0.1)}
                border={withAlpha(theme.sunday, 0.3)}
              />
            ) : null}
            {noHearing ? <Banner title="No hearing on this date" lines={['This date was crossed out in InterNyay.']} /> : null}
            {entries.length === 0 ? <Text style={s.empty}>No hearings or applications on this date.</Text> : null}
            {entries.length > 0 ? (
              <DayFilters
                entries={entries} colourOf={colourOf}
                court={court}
                onCourt={v => { animateLayout(); setFCourt(v) }}
              />
            ) : null}
            {entries.length > 0 && shown.length === 0 ? <Text style={s.empty}>No hearings match these filters.</Text> : null}

            {selectedCourt.length > 0 ? mineGroups.map(([court, list]) => (
              <View key={court}>
                <SectionHeader colour={colourOf(court)} label={court} count={list.length} />
                {list.map(e => (
                  <Reveal key={e.key} delay={next()} skip={stepping}>
                    <HearingCard entry={e} colour={colourOf(e.court)} leave={leaveOf(e)} highlighted hideCourt onNote={onNote} />
                  </Reveal>
                ))}
              </View>
            )) : null}

            {selectedCourt.length > 0 && mine.length === 0 && shown.length > 0 ? (
              <Text style={s.note}>{noCourtSelected(selectedCourt) ? 'No court is selected.' : `No hearing or application in ${selectedCourt.length === 1 ? selectedCourt[0] : 'the selected courts'} on this date.`}</Text>
            ) : null}

            {otherGroups.map(([court, list]) => (
              <View key={court}>
                <SectionHeader colour={colourOf(court)} label={selectedCourt.length ? `Other court: ${court}` : court} count={list.length} />
                {list.map(e => (
                  <Reveal key={e.key} delay={next()} skip={stepping}>
                    <HearingCard entry={e} colour={colourOf(e.court)} leave={leaveOf(e)} hideCourt onNote={onNote} />
                  </Reveal>
                ))}
              </View>
            ))}
          </SheetScroll>
        </Animated.View>
        {date ? (
          <DayLeaveBar
            date={date} open={leaveOpen} onOpenChange={setLeaveOpen} entries={entries}
            leaves={judgeLeaves} courts={courts} selectedCourt={selectedCourt} colourOf={colourOf}
          />
        ) : null}
      </View>
    </Sheet>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  body: { flex: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 10 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  section: { flexShrink: 1, ...font.label, fontWeight: '700', color: theme.ink },
  count: { minWidth: 22, alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.line },
  countText: { ...font.caption, fontVariant: font.digits, fontWeight: '700', color: theme.muted },
  empty: { textAlign: 'center', ...font.body, color: theme.muted, marginTop: 40 },
  note: { color: theme.muted, ...font.small, marginBottom: 8 },
}))
