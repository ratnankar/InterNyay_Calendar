import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { cardShadow, font, makeStyles, radius, theme } from '../theme'
import Icon, { IconName } from './Icon'
import Reveal from './Reveal'
import Tappable from './Tappable'

interface Props {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  icon?: IconName
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ visible, title, message, confirmLabel, icon, danger, onConfirm, onCancel }: Props) {
  const s = useS()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Dismiss" />
        <Reveal variant="pop" style={s.reveal}>
          <View style={s.card} accessibilityViewIsModal>
            {icon ? (
              <View style={[s.badge, danger && s.badgeDanger]}>
                <Icon name={icon} size={22} color={danger ? theme.danger : theme.brand} />
              </View>
            ) : null}
            <Text style={s.title}>{title}</Text>
            <Text style={s.message}>{message}</Text>
            <View style={s.actions}>
              <Tappable onPress={onCancel} containerStyle={s.slot} style={[s.btn, s.cancel]} accessibilityRole="button">
                <Text style={s.cancelText}>Cancel</Text>
              </Tappable>
              <Tappable onPress={onConfirm} containerStyle={s.slot} style={[s.btn, danger ? s.danger : s.primary]} accessibilityRole="button">
                <Text style={danger ? s.dangerText : s.primaryText}>{confirmLabel}</Text>
              </Tappable>
            </View>
          </View>
        </Reveal>
      </View>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  reveal: { width: '100%', maxWidth: 360 },
  card: { width: '100%', backgroundColor: theme.card, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: theme.line, ...cardShadow },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft, marginBottom: 12 },
  badgeDanger: { backgroundColor: theme.dangerSoft },
  title: { ...font.sheetTitle, fontWeight: '700', color: theme.ink, fontFamily: theme.display },
  message: { ...font.body, color: theme.muted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  slot: { flex: 1 },
  btn: { height: 44, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.brandSoft },
  cancelText: { color: theme.ink, fontWeight: '600', ...font.label },
  primary: { backgroundColor: theme.goldBtn },
  primaryText: { color: theme.navy, fontWeight: '700', ...font.label },
  danger: { backgroundColor: theme.danger },
  dangerText: { color: theme.onDanger, fontWeight: '700', ...font.label },
}))
