import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { font, liftShadow, makeStyles, radius, theme } from '../theme'
import Icon, { IconName } from './Icon'
import Reveal from './Reveal'
import Tappable from './Tappable'

export interface MenuItem {
  key: string
  label: string
  icon?: IconName
  selected?: boolean
  danger?: boolean
  onPress: () => void
}

interface Props {
  visible: boolean
  onClose: () => void
  items: MenuItem[]
  align?: 'left' | 'right'
  header?: React.ReactNode
}

export default function PopoverMenu({ visible, onClose, items, align = 'left', header }: Props) {
  const s = useS()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Dismiss menu">
        <Reveal variant="pop" style={[s.anchor, { top: insets.top + 52 }, align === 'left' ? s.left : s.right]}>
          <View style={s.card}>
            {header ? <View style={s.header}>{header}</View> : null}
            {items.map(item => (
              <Tappable
                key={item.key}
                pressedScale={0.99}
                accessibilityRole="button"
                accessibilityState={{ selected: !!item.selected }}
                onPress={() => { onClose(); item.onPress() }}
                style={s.item}
              >
                {item.icon ? <Icon name={item.icon} size={20} color={item.danger ? theme.danger : theme.muted} /> : null}
                <Text style={[s.label, item.danger && s.danger]}>{item.label}</Text>
                {item.selected ? <Icon name="check" size={18} color={theme.brand} /> : null}
              </Tappable>
            ))}
          </View>
        </Reveal>
      </Pressable>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.scrimSoft },
  anchor: { position: 'absolute', minWidth: 220, maxWidth: 320 },
  left: { left: 8 },
  right: { right: 8 },
  card: { backgroundColor: theme.card, borderRadius: radius.md, paddingVertical: 6, overflow: 'hidden', ...liftShadow },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 16 },
  label: { flex: 1, ...font.label, fontWeight: '500', color: theme.ink },
  danger: { color: theme.danger },
}))
