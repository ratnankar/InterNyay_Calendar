import React, { useState } from 'react'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { useLayout } from '../layout'
import { NO_COURTS } from '../hearings'
import { font, HOLIDAY_COLOURS, makeStyles, PALETTE, PALETTE_COLUMNS, readable, theme } from '../theme'
import Icon from './Icon'
import Tappable from './Tappable'

interface Props {
  courts: string[]
  counts?: Map<string, number>
  court: string[]
  onCourt: (c: string[]) => void
  colourOf: (court: string) => string
  onPickColour: (court: string, colour: string) => void
  onRefresh: () => void
  onSettings: () => void
  onNotepad: () => void
  top?: React.ReactNode
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  const s = useS()
  return (
    <Tappable onPress={onToggle} pressedScale={0.99} hoverStyle={s.itemHover} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} style={s.sectionHead}>
      <Text style={s.sectionText}>{title}</Text>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} size={22} color={theme.muted} />
    </Tappable>
  )
}

export function toggleCourt(sel: string[], all: string[], c: string): string[] {
  const now = sel.length === 0 ? all : sel.filter(Boolean)
  const next = now.includes(c) ? now.filter(x => x !== c) : [...now, c]
  if (next.length === 0) return NO_COURTS
  return next.length >= all.length ? [] : next
}

export function pickCourt(sel: string[], all: string[], c: string): string[] {
  if (sel.length === 0) return all.length > 1 ? [c] : []
  return toggleCourt(sel, all, c)
}

function Row({ icon, label, selected, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; selected?: boolean; onPress: () => void }) {
  const s = useS()
  return (
    <Tappable onPress={onPress} pressedScale={0.99} hoverStyle={selected ? undefined : s.itemHover} accessibilityRole="button" accessibilityState={{ selected: !!selected }} style={[s.item, selected && s.itemOn]}>
      <Icon name={icon} size={22} color={selected ? theme.brand : theme.muted} />
      <Text style={[s.itemText, selected && s.itemTextOn]}>{label}</Text>
    </Tappable>
  )
}

export default function NavPanel({ courts, counts, court, onCourt, colourOf, onPickColour, onRefresh, onSettings, onNotepad, top }: Props) {
  const s = useS()
  const { docked } = useLayout()
  const [editing, setEditing] = useState<string | null>(null)
  const [courtsOpen, setCourtsOpen] = useState(true)
  const [holidaysOpen, setHolidaysOpen] = useState(true)

  return (
    <ScrollView style={[s.root, docked && s.rootDocked]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.brand}>
        <Image source={require('../../assets/logo.png')} style={s.logo} accessibilityLabel="InterNyay logo" />
        <Text style={s.brandText} numberOfLines={1}>Calendar</Text>
        <View style={s.brandFill} />
        <Tappable onPress={onRefresh} pressedScale={0.9} hoverStyle={s.itemHover} accessibilityRole="button" accessibilityLabel="Refresh hearings" style={s.refresh}>
          <Icon name="refresh" size={22} color={theme.muted} />
        </Tappable>
      </View>

      <Row icon="note" label="Notepad" onPress={onNotepad} />
      <View style={s.divider} />

      {top}

      <SectionHeader title="Courts" open={courtsOpen} onToggle={() => setCourtsOpen(o => !o)} />

      {courtsOpen ? (
        <>
          {courts.length === 0 ? <Text style={s.none}>No courts found yet. Use refresh at the top of this menu.</Text> : null}
          {courts.length > 1 ? (
            <Tappable onPress={() => onCourt([])} pressedScale={0.99} hoverStyle={court.length === 0 ? undefined : s.itemHover} accessibilityRole="button" accessibilityState={{ selected: court.length === 0 }} style={[s.item, s.allRow, court.length === 0 && s.itemOn]}>
              <View style={s.allIcon}><Icon name="gavel" size={22} color={court.length === 0 ? theme.brand : theme.muted} /></View>
              <Text style={[s.itemText, court.length === 0 && s.itemTextOn]}>All courts</Text>
            </Tappable>
          ) : null}
          {courts.map(c => {
            const colour = colourOf(c)
            const checked = court.length === 0 || court.includes(c)
            const open = editing === c
            return (
              <View key={c}>
                <View style={[s.courtRow, docked && s.compactRow]}>
                  <Tappable
                    onPress={() => onCourt(pickCourt(court, courts, c))}
                    pressedScale={0.99}
                    hoverStyle={s.itemHover}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={c}
                    containerStyle={s.courtMain}
                    style={[s.courtInner, docked && s.compactRow]}
                  >
                    <View style={[s.box, { borderColor: colour }, checked && { backgroundColor: colour }]}>
                      {checked ? <Icon name="check" size={14} color={readable(colour).ink} /> : null}
                    </View>
                    <Text style={s.courtText} numberOfLines={1}>{c}</Text>
                    {counts?.get(c) ? <Text style={s.count}>{counts.get(c)}</Text> : null}
                  </Tappable>
                  <Tappable onPress={() => setEditing(open ? null : c)} pressedScale={0.9} accessibilityRole="button" accessibilityLabel={`Colour of ${c}`} style={[s.colourBtn, docked && s.compactBtn]}>
                    <Icon name="palette" size={20} color={open ? theme.brand : theme.faint} />
                  </Tappable>
                </View>
                {open ? (
                  <View style={s.palette}>
                    {Array.from({ length: Math.ceil(PALETTE.length / PALETTE_COLUMNS) }, (_, i) => PALETTE.slice(i * PALETTE_COLUMNS, (i + 1) * PALETTE_COLUMNS)).map((rowColours, i) => (
                      <View key={i} style={s.paletteRow}>
                        {rowColours.map(p => (
                          <Tappable key={p} onPress={() => onPickColour(c, p)} pressedScale={0.88} accessibilityRole="button" accessibilityLabel={`Colour ${p}`} accessibilityState={{ selected: p === colour }} style={[s.swatch, { backgroundColor: p }]}>
                            {p === colour ? <Icon name="check" size={16} color={readable(p).ink} /> : null}
                          </Tappable>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )
          })}

        </>
      ) : null}

      <View style={s.divider} />
      <SectionHeader title="Court holidays" open={holidaysOpen} onToggle={() => setHolidaysOpen(o => !o)} />
      {holidaysOpen ? (
        <>
          <View style={s.legend}><View style={[s.legendDot, { backgroundColor: HOLIDAY_COLOURS.DISTRICT.solid }]} /><Text style={s.legendText}>District Court</Text></View>
          <View style={s.legend}><View style={[s.legendDot, { backgroundColor: HOLIDAY_COLOURS.HIGH.solid }]} /><Text style={s.legendText}>High Court</Text></View>
          <View style={s.legend}>
            <View style={[s.legendDot, s.legendBoth]}>
              <View style={[s.legendHalf, { backgroundColor: HOLIDAY_COLOURS.DISTRICT.solid }]} />
              <View style={[s.legendHalf, { backgroundColor: HOLIDAY_COLOURS.HIGH.solid }]} />
            </View>
            <Text style={s.legendText}>Both</Text>
          </View>
        </>
      ) : null}

      <View style={s.divider} />
      <Row icon="settings" label="Settings" onPress={onSettings} />
    </ScrollView>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.card },

  rootDocked: { backgroundColor: 'transparent' },
  content: { paddingBottom: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 64, paddingHorizontal: 20 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  brandFill: { flex: 1 },
  refresh: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brandText: { flexShrink: 1, ...font.sheetTitle, fontWeight: '700', color: theme.ink, fontFamily: theme.display },
  item: { flexDirection: 'row', alignItems: 'center', gap: 18, height: 48, marginRight: 12, paddingLeft: 20, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
  itemOn: { backgroundColor: theme.blueSoft },
  itemHover: { backgroundColor: theme.hover },
  itemText: { ...font.label, fontWeight: '500', color: theme.ink },
  itemTextOn: { color: theme.brand },
  divider: { height: 1, backgroundColor: theme.line, marginVertical: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, marginRight: 12, paddingLeft: 20, paddingRight: 8, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  sectionText: { ...font.label, fontWeight: '500', color: theme.ink },
  none: { ...font.small, color: theme.faint, paddingHorizontal: 20, paddingBottom: 6 },
  courtRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  courtMain: { flex: 1 },
  courtInner: { flexDirection: 'row', alignItems: 'center', gap: 20, minHeight: 44, paddingLeft: 20 },
  compactRow: { minHeight: 36 },
  box: { width: 18, height: 18, borderRadius: 3, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  courtText: { flex: 1, ...font.body, color: theme.ink },
  allRow: { gap: 20 },
  allIcon: { width: 20, alignItems: 'center', justifyContent: 'center' },
  count: { ...font.caption, fontVariant: font.digits, color: theme.faint },
  colourBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  compactBtn: { width: 36, height: 36 },
  palette: { gap: 10, paddingLeft: 60, paddingRight: 22, paddingBottom: 12, paddingTop: 2 },
  paletteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 32, paddingLeft: 24 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendBoth: { flexDirection: 'row', overflow: 'hidden', backgroundColor: 'transparent' },
  legendHalf: { flex: 1 },
  legendText: { ...font.body, color: theme.ink },
}))
