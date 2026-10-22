import React, { useEffect, useRef, useState } from 'react'
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { duration, easeOut, native, useReduceMotion } from '../motion'
import { liftShadow, theme, makeStyles } from '../theme'

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Drawer({ visible, onClose, children }: Props) {
  const s = useS()
  const { width } = useWindowDimensions()
  const panel = Math.min(320, Math.round(width * 0.85))
  const [mounted, setMounted] = useState(visible)
  const t = useRef(new Animated.Value(visible ? 1 : 0)).current
  const reduce = useReduceMotion()

  useEffect(() => {
    if (visible) setMounted(true)
    Animated.timing(t, { toValue: visible ? 1 : 0, duration: reduce ? 0 : duration.base, easing: easeOut, useNativeDriver: native }).start(({ finished }) => {
      if (finished && !visible) setMounted(false)
    })
  }, [visible, reduce, t])

  // Swipe the menu to the left to close it: it follows the finger and either closes or springs back
  const panelRef = useRef(panel)
  panelRef.current = panel
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const reduced = useRef(reduce)
  reduced.current = reduce
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => t.stopAnimation(),
      onPanResponderMove: (_, g) => t.setValue(Math.max(0, Math.min(1, 1 + g.dx / panelRef.current))),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -panelRef.current * 0.3 || g.vx < -0.5) { closeRef.current(); return }
        Animated.timing(t, { toValue: 1, duration: reduced.current ? 0 : duration.fast, easing: easeOut, useNativeDriver: native }).start()
      },
      onPanResponderTerminate: () => {
        Animated.timing(t, { toValue: 1, duration: reduced.current ? 0 : duration.fast, easing: easeOut, useNativeDriver: native }).start()
      },
    }),
  )

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider>
        <Animated.View style={[s.scrim, { opacity: t }]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          style={[s.panel, { width: panel, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-panel, 0] }) }] }]}
        >
          <SafeAreaView style={s.fill} edges={['top', 'bottom', 'left']}>{children}</SafeAreaView>
        </Animated.View>
      </SafeAreaProvider>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: theme.card, borderTopRightRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden', ...liftShadow },
}))
