import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ease, native, useReduceMotion } from '../motion'
import { liftShadow, theme, makeStyles } from '../theme'
import { useAnimatedValue } from '../useAnimatedValue'

interface Props {
  visible: boolean
  onClose: () => void
  onClosed?: () => void
  children: React.ReactNode
}

const enterEase = ease.enter
const exitEase = ease.exit
const OPEN_MS = 300
const CLOSE_MS = 210
const SETTLE_MS = 180
const SHADOW_GAP = 16

export default function Drawer({ visible, onClose, onClosed, children }: Props) {
  const s = useS()
  const { width } = useWindowDimensions()
  const panel = Math.min(320, Math.round(width * 0.85))
  const [mounted, setMounted] = useState(visible)
  const [moving, setMoving] = useState(true)
  const t = useAnimatedValue(visible ? 1 : 0)
  const reduce = useReduceMotion()

  const reduced = useRef(reduce)
  reduced.current = reduce
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const closedRef = useRef(onClosed)
  closedRef.current = onClosed
  const panelRef = useRef(panel)
  panelRef.current = panel

  const laidOut = useRef(false)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  const slideTo = useCallback((to: 0 | 1, from?: number) => {
    const go = (start: number) => {
      const full = to === 1 ? OPEN_MS : CLOSE_MS
      const ms = reduced.current ? 0 : Math.round(full * Math.max(0.35, Math.abs(to - start)))
      Animated.timing(t, {
        toValue: to,
        duration: ms,
        easing: to === 1 ? enterEase : exitEase,
        useNativeDriver: native,
      }).start(({ finished }) => {
        if (!finished) return
        if (to === 1) { setMoving(false); return }
        laidOut.current = false
        setMounted(false)
        closedRef.current?.()
      })
    }
    if (from !== undefined) go(from)
    else t.stopAnimation(go)
  }, [t])

  // ⬇️ Moved above PanResponder.create so it's declared before use
  const settleOpen = (from: number) => {
    const start = Math.max(0, Math.min(1, from))
    Animated.timing(t, {
      toValue: 1,
      duration: reduced.current ? 0 : Math.round(SETTLE_MS * Math.max(0.35, 1 - start)),
      easing: enterEase,
      useNativeDriver: native,
    }).start(({ finished }) => { if (finished) setMoving(false) })
  }

  const grabX = useRef(0)
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: (_, g) => {
        grabX.current = g.dx
        setMoving(true)
        t.stopAnimation()
      },
      onPanResponderMove: (_, g) => t.setValue(Math.max(0, Math.min(1, 1 + (g.dx - grabX.current) / panelRef.current))),
      onPanResponderRelease: (_, g) => {
        const travelled = g.dx - grabX.current
        if (travelled < -panelRef.current * 0.3 || g.vx < -0.5) { closeRef.current(); return }
        settleOpen(1 + travelled / panelRef.current)
      },
      onPanResponderTerminate: (_, g) => settleOpen(1 + (g.dx - grabX.current) / panelRef.current),
    }),
  )

  useEffect(() => {
    if (visible) {
      if (!mounted) { setMoving(true); setMounted(true); return }
      if (laidOut.current) { setMoving(true); slideTo(1) }
    } else if (mounted) {
      setMoving(true)
      slideTo(0)
    }
  }, [visible, mounted, slideTo])

  const onPanelLayout = useCallback(() => {
    if (laidOut.current) return
    laidOut.current = true
    if (visibleRef.current) slideTo(1, 0)
  }, [slideTo])

  const slide = useMemo(() => t.interpolate({ inputRange: [0, 1], outputRange: [-panel - SHADOW_GAP, 0] }), [t, panel])

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Animated.View {...pan.panHandlers} style={[s.scrim, { opacity: t }]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          onLayout={onPanelLayout}
          renderToHardwareTextureAndroid={moving}
          style={[s.panel, { width: panel, transform: [{ translateX: slide }] }]}
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