import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { useLayout } from '../layout'
import { font, makeStyles, radius, theme } from '../theme'
import Avatar from './Avatar'
import Icon from './Icon'
import IconButton from './IconButton'
import PopoverMenu from './PopoverMenu'
import Tappable from './Tappable'
import TodayIcon from './TodayIcon'

interface Props {
  title: string
  subtitle?: string
  showMenu: boolean
  showArrows: boolean
  onMenu: () => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSearch: () => void
  onSettings: () => void
  picture?: string | null
  userName: string
  userEmail: string
  onSignOut: () => void
}

export default function AppBar({ title, subtitle, showMenu, showArrows, onMenu, onPrev, onNext, onToday, onSearch, onSettings, picture, userName, userEmail, onSignOut }: Props) {
  const s = useS()
  const { width } = useLayout()
  const [accountOpen, setAccountOpen] = useState(false)
  const labelled = width >= 720
  const searchBox = width >= 1180

  return (
    <View style={s.bar}>
      {showMenu ? <IconButton icon="menu" label="Open menu" tone="plain" onPress={onMenu} /> : null}

      {labelled ? (
        <Tappable onPress={onToday} pressedScale={0.96} hoverStyle={s.hoverSoft} accessibilityRole="button" accessibilityLabel="Go to today" style={s.todayBtn}>
          <Text style={s.todayText}>Today</Text>
        </Tappable>
      ) : null}

      {showArrows ? (
        <>
          <IconButton icon="chevronLeft" label="Previous" tone="plain" onPress={onPrev} />
          <IconButton icon="chevronRight" label="Next" tone="plain" onPress={onNext} />
        </>
      ) : null}

      <View style={s.titleSlot} accessible accessibilityRole="header">
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={s.fill} />

      {searchBox ? (
        <Tappable onPress={onSearch} pressedScale={0.99} hoverStyle={s.hoverFill} accessibilityRole="button" accessibilityLabel="Search hearings" containerStyle={s.searchSlot} style={s.searchPill}>
          <Icon name="search" size={20} color={theme.muted} />
          <Text style={s.searchText} numberOfLines={1}>Search hearings</Text>
          <View style={s.key}><Text style={s.keyText}>/</Text></View>
        </Tappable>
      ) : (
        <IconButton icon="search" label="Search" tone="plain" onPress={onSearch} />
      )}

      {labelled ? <IconButton icon="settings" label="Settings" tone="plain" onPress={onSettings} /> : null}

      {labelled ? null : (
        <Tappable onPress={onToday} pressedScale={0.9} hoverStyle={s.hoverFill} accessibilityRole="button" accessibilityLabel="Go to today" style={s.iconBtn}>
          <TodayIcon />
        </Tappable>
      )}

      <Tappable onPress={() => setAccountOpen(true)} pressedScale={0.92} accessibilityRole="button" accessibilityLabel="Account" style={s.avatar}>
        <Avatar uri={picture} size={36} />
      </Tappable>

      <PopoverMenu
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        align="right"
        header={
          <View style={s.account}>
            <Avatar uri={picture} size={48} />
            <View style={s.accountText}>
              <Text style={s.name} numberOfLines={1}>{userName}</Text>
              <Text style={s.email} numberOfLines={1}>{userEmail}</Text>
            </View>
          </View>
        }
        items={[
          { key: 'settings', label: 'Settings', icon: 'settings', onPress: onSettings },
          { key: 'signout', label: 'Sign out', icon: 'signOut', danger: true, onPress: onSignOut },
        ]}
      />
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 8, gap: 2 },
  titleSlot: { flexShrink: 1, minWidth: 0, justifyContent: 'center', height: 48, paddingHorizontal: 10 },
  title: { ...font.appBar, fontWeight: '600', color: theme.ink },
  subtitle: { ...font.caption, color: theme.muted },
  fill: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, marginHorizontal: 4, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hoverFill: { backgroundColor: theme.hoverTint },
  hoverSoft: { backgroundColor: theme.hover },
  todayBtn: { height: 40, paddingHorizontal: 20, marginLeft: 8, marginRight: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  todayText: { ...font.label, fontWeight: '500', color: theme.ink },
  searchSlot: { flexShrink: 1, width: 360, marginHorizontal: 8 },
  searchPill: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: theme.brandSoft },
  searchText: { flex: 1, ...font.body, color: theme.muted },
  key: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  keyText: { ...font.caption, fontWeight: '500', color: theme.muted },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  accountText: { flex: 1, minWidth: 0 },
  name: { ...font.title, fontWeight: '600', color: theme.ink },
  email: { ...font.small, color: theme.muted },
}))
