import React from 'react'
import { Platform, StyleSheet, Switch, View } from 'react-native'
import { Text } from '../ui'
import { useSettings } from '../SettingsContext'
import { font, makeStyles, radius, theme, withAlpha } from '../theme'
import Sheet from './Sheet'
import SheetHeader from './SheetHeader'
import SheetScroll from './SheetScroll'
import Reveal from './Reveal'
import Tappable from './Tappable'

interface Props {
  visible: boolean
  onClose: () => void
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const s = useS()
  return (
    <Reveal>
      <View style={s.group}>
        <Text style={s.groupTitle}>{title}</Text>
        <View style={s.card}><View style={s.rows}>{children}</View></View>
      </View>
    </Reveal>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const s = useS()
  return (
    <View style={s.setting}>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <View style={s.control}>{children}</View>
    </View>
  )
}

function Choice<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const s = useS()
  return (
    <View style={s.choices}>
      {options.map(o => {
        const on = o.value === value
        return (
          <Tappable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            pressedScale={0.96}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            selected={on}
            style={[s.pill, on && s.pillOn]}
          >
            <Text style={[s.pillText, on && s.pillTextOn]}>{o.label}</Text>
          </Tappable>
        )
      })}
    </View>
  )
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const s = useS()
  return (
    <View style={[s.setting, s.toggleRow]}>
      <View style={s.toggleText}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.line, true: withAlpha(theme.brand, 0.45) }}
        thumbColor={value ? theme.brand : '#FFFFFF'}
      />
    </View>
  )
}

const SHORTCUTS: [string[], string][] = [
  [['T'], 'Go to today'],
  [['←', '→'], 'Previous / next'],
  [['/'], 'Search hearings'],
]

export default function SettingsSheet({ visible, onClose }: Props) {
  const s = useS()
  const { settings, update, reset } = useSettings()

  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader title="Settings" subtitle="Saved to your account" onClose={onClose} />
      <SheetScroll>
        <Group title="Appearance">
          <Setting label="Theme" hint="System follows your phone or browser">
            <Choice
              value={settings.appearance}
              onChange={v => update({ appearance: v })}
              options={[{ value: 'system' as const, label: 'System' }, { value: 'light' as const, label: 'Light' }, { value: 'dark' as const, label: 'Dark' }]}
            />
          </Setting>
        </Group>

        <Group title="Date">
          <Setting label="Week starts on">
            <Choice
              value={settings.weekStart}
              onChange={v => update({ weekStart: v })}
              options={[{ value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }]}
            />
          </Setting>
        </Group>

        <Group title="Calendar">
          <Toggle label="Court holidays" hint="Show holidays set by InterNyay" value={settings.showHolidays} onChange={v => update({ showHolidays: v })} />
          <Toggle label="No-hearing dates" hint="Show dates crossed out on the website" value={settings.showNoHearing} onChange={v => update({ showNoHearing: v })} />
        </Group>

        {Platform.OS === 'web' ? (
          <Group title="Keyboard shortcuts">
            {SHORTCUTS.map(([keys, what]) => (
              <View key={what} style={s.shortcut}>
                <Text style={s.shortcutWhat}>{what}</Text>
                <View style={s.shortcutKeys}>{keys.map(k => <View key={k} style={s.kbd}><Text style={s.kbdText}>{k}</Text></View>)}</View>
              </View>
            ))}
          </Group>
        ) : null}

        <Tappable onPress={reset} pressedScale={0.97} accessibilityRole="button" containerStyle={s.resetSlot} style={s.reset}>
          <Text style={s.resetText}>Reset to defaults</Text>
        </Tappable>
      </SheetScroll>
    </Sheet>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  group: { marginBottom: 20 },
  groupTitle: { ...font.small, fontWeight: '700', color: theme.brand, marginBottom: 8, paddingHorizontal: 4 },
  card: { backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },

  rows: { marginBottom: -1 },
  setting: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.line },
  label: { ...font.label, fontWeight: '500', color: theme.ink },
  hint: { ...font.small, color: theme.muted, marginTop: 1 },
  control: { marginTop: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  pillOn: { borderColor: theme.brand, backgroundColor: theme.blueSoft },
  pillText: { ...font.body, fontWeight: '500', color: theme.muted },
  pillTextOn: { color: theme.brand },
  shortcut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  shortcutWhat: { flex: 1, ...font.body, color: theme.ink },
  shortcutKeys: { flexDirection: 'row', gap: 4 },
  kbd: { minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' },
  kbdText: { ...font.caption, fontWeight: '500', color: theme.muted },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  resetSlot: { alignSelf: 'center' },
  reset: { height: 40, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  resetText: { ...font.body, fontWeight: '600', color: theme.brand },
}))
