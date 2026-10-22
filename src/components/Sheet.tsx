import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useLayout } from '../layout'
import Reveal from './Reveal'
import { liftShadow, theme, makeStyles } from '../theme'

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  background?: string
}

export default function Sheet({ visible, onClose, children, background }: Props) {
  const s = useS()
  const { dialog, height } = useLayout()

  if (dialog) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait', 'landscape']}>
        <SafeAreaProvider>
          <View style={s.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
            <Reveal variant="pop" style={[s.dialog, { height: Math.min(height - 48, 780), backgroundColor: background || theme.bg }]}>
              <View style={s.fill} accessibilityViewIsModal>{children}</View>
            </Reveal>
          </View>
        </SafeAreaProvider>
      </Modal>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <SafeAreaProvider>
        <SafeAreaView style={[s.root, background ? { backgroundColor: background } : null]} edges={['top', 'left', 'right']}>{children}</SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, backgroundColor: theme.bg },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.scrim },
  dialog: { width: '100%', maxWidth: 640, borderRadius: 24, overflow: 'hidden', ...liftShadow },
}))
