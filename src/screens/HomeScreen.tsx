import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLatest, useOnChange } from '../hooks'
import { useAuth } from '../AuthContext'
import AppBar from '../components/AppBar'
import ConfirmModal from '../components/ConfirmModal'
import ErrorBoundary from '../ErrorBoundary'
import DateSheet from '../components/DateSheet'
import Drawer from '../components/Drawer'
import Icon from '../components/Icon'
import LeaveSlider, { HANDLE_HEIGHT } from '../components/LeaveSlider'
import MiniMonth from '../components/MiniMonth'
import MonthCalendar from '../components/MonthCalendar'
import MonthStrip from '../components/MonthStrip'
import NotepadSheet, { NoteCase } from '../components/NotepadSheet'
import NavPanel, { toggleCourt } from '../components/NavPanel'
import Reveal from '../components/Reveal'
import SearchScreen from '../components/SearchScreen'
import SettingsSheet from '../components/SettingsSheet'
import Skeleton from '../components/Skeleton'
import Tappable from '../components/Tappable'
import { fetchMe } from '../api'
import { addDays, addMonths, MONTHS, parseKey, todayKey } from '../dates'
import { countLabel, inCourts, noCourtSelected } from '../hearings'
import { clearListNos, loadListNos } from '../listNo'
import { useLayout } from '../layout'
import { usePrefs, useSettings } from '../SettingsContext'
import { defaultColour, font, makeStyles, radius, theme, withAlpha } from '../theme'
import { HearingEntry, Holiday } from '../types'
import { Text } from '../ui'
import { useHearingData } from '../useHearingData'

const NO_HOLIDAYS = new Map<string, Holiday>()
const NO_DATES = new Set<string>()

export default function HomeScreen({ token }: { token: string }) {
  const s = useS()
  const { session, signOut } = useAuth()
  const { entries, byDate, judgeLeaves, courts, holidayByDate: allHolidays, noHearing: allNoHearing, loading, refreshing, error, notice, reload } = useHearingData(token, session?.user.id)
  const { settings } = useSettings()
  const { colours, courtFilter: court, setColour, setCourtFilter: setCourt } = usePrefs()
  const holidayByDate = settings.showHolidays ? allHolidays : NO_HOLIDAYS
  const noHearing = settings.showNoHearing ? allNoHearing : NO_DATES
  const { docked, dockWidth, arrows, short } = useLayout()

  const [anchor, setAnchor] = useState(todayKey())
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickerBase, setPickerBase] = useState(anchor)
  useOnChange(anchor, setPickerBase)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [, setItemsLoaded] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notepad, setNotepad] = useState<{ scope: NoteCase | null; startNew?: boolean } | null>(null)
  const [picture, setPicture] = useState<string | null>(session?.user.profilePicture || null)

  const loadMe = useCallback(() => {
    fetchMe(token).then(u => setPicture(u.profilePicture || null)).catch(() => undefined)
  }, [token])

  useEffect(() => { loadMe() }, [loadMe])

  const sortedCourts = useMemo(() => [...courts].sort((a, b) => a.localeCompare(b)), [courts])
  const courtCounts = useMemo(() => {
    const n = new Map<string, number>()
    entries.forEach(e => n.set(e.court, (n.get(e.court) || 0) + 1))
    return n
  }, [entries])
  const colourOf = useCallback(
    (c: string) => colours[c] || defaultColour(Math.max(0, sortedCourts.indexOf(c))),
    [colours, sortedCourts],
  )

  useEffect(() => {
    if (courts.length > 0 && court.some(c => c && !courts.includes(c))) setCourt(court.filter(c => courts.includes(c)))
  }, [courts, court, setCourt])

  const step = useCallback((d: number) => setAnchor(a => addMonths(a, d)), [])
  const goToday = () => setAnchor(todayKey())

  const stepSheetDay = (delta: number) => {
    if (!sheetDate) return
    const next = addDays(sheetDate, delta)
    setSheetDate(next)
    setAnchor(next)
  }

  // Keyed on the month, not the day: tapping another date in the same month must not rescan every hearing
  const monthKey = anchor.slice(0, 7)
  const monthEntries = useMemo(() => {
    const out: HearingEntry[] = []
    byDate.forEach((list, k) => { if (k.startsWith(monthKey)) out.push(...list) })
    return out
  }, [monthKey, byDate])

  const rangeList = useMemo(() => monthEntries.filter(e => inCourts(court, e.court)), [monthEntries, court])

  const month = anchor.slice(0, 7)
  useEffect(() => {
    if (loading) return
    const dates: string[] = []
    byDate.forEach((list, k) => { if (k.startsWith(month) && list.some(e => e.kind === 'hearing')) dates.push(k) })
    if (!dates.length) return
    let live = true
    loadListNos(token, dates).then(changed => { if (live && changed) setItemsLoaded(n => n + 1) })
    return () => { live = false }
  }, [token, month, byDate, loading])

  // What a menu item opens (a sheet, a refresh) waits until the menu has finished sliding out, so the two never
  // compete for the same frames. With the menu docked there is nothing to wait for.
  const afterDrawer = useRef<(() => void) | null>(null)
  const closeDrawerThen = (fn: () => void) => {
    if (docked || !drawerOpen) { setDrawerOpen(false); fn(); return }
    afterDrawer.current = fn
    setDrawerOpen(false)
  }
  const openDrawer = () => { afterDrawer.current = null; setDrawerOpen(true) }
  const dismissDrawer = () => { afterDrawer.current = null; setDrawerOpen(false) }
  const onDrawerClosed = useCallback(() => {
    const fn = afterDrawer.current
    afterDrawer.current = null
    fn?.()
  }, [])

  const refresh = () => { clearListNos(); reload(); loadMe() }
  const getRefresh = useLatest(refresh)
  const stableRefresh = useCallback(() => getRefresh()(), [getRefresh])
  const selectDate = useCallback((d: string) => { setAnchor(d); setSheetDate(d) }, [])
  const swipeUp = useCallback(() => setLeaveOpen(true), [])

  // The notepad opens once the sheet or search it was started from has finished closing
  const notepadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (notepadTimer.current) clearTimeout(notepadTimer.current) }, [])
  const openCaseNotes = (e: HearingEntry, startNew = false) => {
    setSheetDate(null)
    setSearchOpen(false)
    if (notepadTimer.current) clearTimeout(notepadTimer.current)
    notepadTimer.current = setTimeout(() => {
      notepadTimer.current = null
      setNotepad({ scope: { caseId: e.caseId, caseTitle: e.caseTitle }, startNew })
    }, 350)
  }

  const anyOpen = !!sheetDate || searchOpen || settingsOpen || signOutOpen || drawerOpen || !!notepad
  const getOnKey = useLatest((key: string) => {
    if (anyOpen) return false
    switch (key) {
      case 't': goToday(); return true
      case 'ArrowLeft': case 'k': case 'p': step(-1); return true
      case 'ArrowRight': case 'j': case 'n': step(1); return true
      case '/': setSearchOpen(true); return true
      default: return false
    }
  })
  useEffect(() => {
    const doc = (globalThis as any).document
    if (Platform.OS !== 'web' || !doc) return
    const handler = (ev: any) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return
      const target = ev.target
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (getOnKey()(ev.key)) ev.preventDefault()
    }
    doc.addEventListener('keydown', handler)
    return () => doc.removeEventListener('keydown', handler)
  }, [getOnKey])

  const a = parseKey(anchor)
  // The month chips, title and arrows follow `anchor` at once; the heavy calendar grid catches up right after,
  // so tapping a month never waits for 42 cells to be redrawn before it responds
  const shownAnchor = useDeferredValue(anchor)
  const shown = parseKey(shownAnchor)
  const isNowYear = a.getFullYear() === new Date().getFullYear()

  const title = short
    ? (isNowYear ? MONTHS[a.getMonth()] : `${MONTHS[a.getMonth()].slice(0, 3)} ${a.getFullYear()}`)
    : `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
  const subtitle = loading ? '' : rangeList.length ? countLabel(rangeList) : 'No hearings'

  const userName = session?.user.name || ''
  // A load error comes first; otherwise the notice (offline copy, applications missing)
  const problem = error || notice

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={stableRefresh} tintColor={theme.brand} colors={[theme.brand]} />,
    [refreshing, stableRefresh],
  )

  // No LayoutAnimation here: it would also animate every chip of the calendar grid, which hitches on a busy month
  const changeCourt = (next: typeof court) => { setCourt(next) }

  const picker = (
    <MiniMonth
      base={pickerBase}
      selected={anchor}
      byDate={byDate}
      court={court}
      onStep={d => setPickerBase(b => addMonths(b, d))}
      onPick={setAnchor}
    />
  )

  const panel = (
    <NavPanel
      courts={sortedCourts}
      counts={courtCounts}
      court={court}
      onCourt={changeCourt}
      colourOf={colourOf}
      onPickColour={setColour}
      onRefresh={() => closeDrawerThen(refresh)}
      onSettings={() => closeDrawerThen(() => setSettingsOpen(true))}
      onNotepad={() => closeDrawerThen(() => setNotepad({ scope: null }))}
      top={docked ? picker : undefined}
    />
  )

  return (
    <SafeAreaView style={[s.root, docked && s.rootDocked]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={s.shell}>
        {docked ? <View style={{ width: dockWidth }}>{panel}</View> : null}

        <View style={s.column}>
          <AppBar
            title={title}
            subtitle={subtitle}
            showMenu={!docked}
            showArrows={arrows}
            onMenu={openDrawer}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onToday={goToday}
            onSearch={() => setSearchOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            picture={picture}
            userName={userName}
            userEmail={session?.user.email || ''}
            onSignOut={() => setSignOutOpen(true)}
          />

          <MonthStrip selected={anchor} byDate={byDate} court={court} onPick={setAnchor} />

          {court.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
              {noCourtSelected(court) ? <Text style={s.noCourts}>No court selected</Text> : null}
              {court.filter(Boolean).map(c => (
                <Tappable
                  key={c}
                  onPress={() => changeCourt(toggleCourt(court, sortedCourts, c))}
                  pressedScale={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={`Showing ${c}. Tap to remove`}
                  style={[s.filter, { backgroundColor: withAlpha(colourOf(c), 0.12), borderColor: colourOf(c) }]}
                >
                  <View style={[s.filterDot, { backgroundColor: colourOf(c) }]} />
                  <Text style={s.filterText} numberOfLines={1}>{c}</Text>
                  <Icon name="close" size={16} color={theme.muted} />
                </Tappable>
              ))}
              {court.length > 1 || noCourtSelected(court) ? (
                <Tappable onPress={() => changeCourt([])} pressedScale={0.96} accessibilityRole="button" accessibilityLabel="Show all courts" style={s.filterAll}>
                  <Text style={s.filterAllText}>All courts</Text>
                </Tappable>
              ) : null}
            </ScrollView>
          ) : null}

          {problem ? (
            <Reveal variant="fade">
              <View style={s.err}>
                <Text style={s.errText}>{problem}</Text>
                <Tappable onPress={refresh} pressedScale={0.94} accessibilityRole="button" containerStyle={s.retrySlot} style={s.retry}>
                  <Text style={s.retryText}>Try again</Text>
                </Tappable>
              </View>
            </Reveal>
          ) : null}

          <View style={[s.body, docked && s.card]}>
            {loading ? (
              <View style={s.skeletons}>
                {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} style={s.skRow} />)}
              </View>
            ) : (
              <Reveal variant="fade" style={s.fill}>
                <MonthCalendar
                  year={shown.getFullYear()} month={shown.getMonth()} weekStart={settings.weekStart} byDate={byDate} holidayByDate={holidayByDate} noHearing={noHearing} judgeLeaves={judgeLeaves}
                  selectedCourt={court} selected={shownAnchor} colourOf={colourOf}
                  onSelectDate={selectDate} onChangeMonth={step}
                  onSwipeUp={swipeUp}
                  refreshControl={refreshControl}
                />
              </Reveal>
            )}
            {loading ? null : (
              <>
                <View style={s.handleSpace} />
                <LeaveSlider
                  open={leaveOpen} onOpenChange={setLeaveOpen} date={anchor}
                  leaves={judgeLeaves} entries={entries} courts={sortedCourts}
                  selectedCourt={court} colourOf={colourOf}
                />
              </>
            )}
          </View>
        </View>
      </View>

      {!docked ? <Drawer visible={drawerOpen} onClose={dismissDrawer} onClosed={onDrawerClosed}>{panel}</Drawer> : null}

      <ErrorBoundary fallback={null} resetKey={sheetDate} onError={() => setSheetDate(null)}>
      <DateSheet
        token={token} date={sheetDate}
        entries={sheetDate ? byDate.get(sheetDate) || [] : []}
        holiday={sheetDate ? holidayByDate.get(sheetDate) : undefined}
        noHearing={sheetDate ? noHearing.has(sheetDate) : false}
        judgeLeaves={judgeLeaves} courts={sortedCourts} selectedCourt={court} colourOf={colourOf} onNote={openCaseNotes} onClose={() => setSheetDate(null)} onStep={stepSheetDay}
      />
      </ErrorBoundary>
      <ErrorBoundary fallback={null} resetKey={settingsOpen} onError={() => setSettingsOpen(false)}>
        <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </ErrorBoundary>
      <ErrorBoundary fallback={null} resetKey={!!notepad} onError={() => setNotepad(null)}>
        <NotepadSheet visible={!!notepad} scope={notepad?.scope || null} startNew={!!notepad?.startNew} onClose={() => setNotepad(null)} />
      </ErrorBoundary>
      <ErrorBoundary fallback={null} resetKey={searchOpen} onError={() => setSearchOpen(false)}>
        <SearchScreen visible={searchOpen} token={token} entries={entries} judgeLeaves={judgeLeaves} colourOf={colourOf} onNote={openCaseNotes} onClose={() => setSearchOpen(false)} />
      </ErrorBoundary>
      <ConfirmModal
        visible={signOutOpen} danger icon="signOut" title="Sign out?" confirmLabel="Sign out"
        message="You will need to sign in again to see your hearings."
        onCancel={() => setSignOutOpen(false)} onConfirm={() => { setSignOutOpen(false); signOut() }}
      />
    </SafeAreaView>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.card },

  rootDocked: { backgroundColor: theme.bg },
  shell: { flex: 1, flexDirection: 'row' },
  fill: { flex: 1 },
  column: { flex: 1, minWidth: 0 },
  body: { flex: 1, minHeight: 0 },
  handleSpace: { height: HANDLE_HEIGHT },
  card: { backgroundColor: theme.card, borderRadius: 16, marginRight: 16, marginBottom: 16, overflow: 'hidden' },
  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterAll: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  noCourts: { ...font.small, color: theme.muted },
  filterAllText: { ...font.small, fontWeight: '500', color: theme.brand },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, maxWidth: 240 },
  filterDot: { width: 10, height: 10, borderRadius: 5 },
  filterText: { flexShrink: 1, ...font.small, fontWeight: '500', color: theme.ink },
  err: { backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerLine, borderRadius: radius.md, padding: 14, marginHorizontal: 12, marginBottom: 10 },
  errText: { color: theme.danger, ...font.body },
  retrySlot: { alignSelf: 'flex-start', marginTop: 10 },
  retry: { height: 34, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.danger },
  retryText: { color: theme.onDanger, fontWeight: '700', ...font.small },
  skeletons: { flex: 1, gap: 10, padding: 12 },
  skRow: { flex: 1, minHeight: 56 },
}))
