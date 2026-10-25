import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useAnimatedValue, useLatest, useOnChange } from '../hooks'
import { ease, native, useReduceMotion } from '../motion'
import { liftShadow, theme, makeStyles } from '../theme'

interface Props {
  visible: boolean
  onClose: () => void
  // Called once the menu has finished sliding out and is gone. Use it to start whatever the menu item opens
  // (a sheet, a refresh) so that work never competes with the slide-out animation.
  onClosed?: () => void
  children: React.ReactNode
}

// Quick start and a long soft landing when opening, a gentle pick-up when closing (shared curves in motion.ts)
const enterEase = ease.enter
const exitEase = ease.exit
const OPEN_MS = 300
const CLOSE_MS = 210
const SETTLE_MS = 180
// Keeps the panel's shadow off the screen edge while it is parked outside the screen
const SHADOW_GAP = 16

interface PanInput {
  panel: number
  reduced: boolean
  close: () => void
}

function createDrawerPan(t: Animated.Value, setMoving: (moving: boolean) => void) {
  const input: PanInput = { panel: 1, reduced: false, close: () => undefined }
  let grabX = 0

  const settleOpen = (from: number) => {
    const start = Math.max(0, Math.min(1, from))
    Animated.timing(t, {
      toValue: 1,
      duration: input.reduced ? 0 : Math.round(SETTLE_MS * Math.max(0.35, 1 - start)),
      easing: enterEase,
      useNativeDriver: native,
    }).start(({ finished }) => { if (finished) setMoving(false) })
  }

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    // Claimed before the rows and the list inside the panel can take the touch, so a swipe left always closes it
    onMoveShouldSetPanResponderCapture: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: (_, g) => {
      grabX = g.dx
      setMoving(true)
      t.stopAnimation()
    },
    onPanResponderMove: (_, g) => t.setValue(Math.max(0, Math.min(1, 1 + (g.dx - grabX) / input.panel))),
    onPanResponderRelease: (_, g) => {
      const travelled = g.dx - grabX
      if (travelled < -input.panel * 0.3 || g.vx < -0.5) { input.close(); return }
      settleOpen(1 + travelled / input.panel)
    },
    onPanResponderTerminate: (_, g) => settleOpen(1 + (g.dx - grabX) / input.panel),
  })

  return {
    responder,
    sync: (next: PanInput) => { input.panel = next.panel; input.reduced = next.reduced; input.close = next.close },
  }
}

export default function Drawer({ visible, onClose, onClosed, children }: Props) {
  const s = useS()
  const { width } = useWindowDimensions()
  const panel = Math.min(320, Math.round(width * 0.85))
  const [mounted, setMounted] = useState(visible)
  // The panel is drawn as one cached layer on Android while it moves (cheap to slide), but not while it rests,
  // because scrolling a long list inside a cached layer redraws the whole layer on every frame
  const [moving, setMoving] = useState(true)
  const t = useAnimatedValue(visible ? 1 : 0)
  const reduce = useReduceMotion()

  const getReduced = useLatest(reduce)
  const getOnClosed = useLatest(onClosed)
  const getOnClose = useLatest(onClose)

  // The slide-in must not start until the Modal has actually mounted and laid out its content.
  // Starting it in the same tick as setMounted(true) means the first frames are spent creating the
  // Modal window and the menu rows, and the clock-driven animation has already moved on by the time
  // anything is visible, so the menu appears to jump or stutter in.
  const laidOut = useRef(false)
  const getVisible = useLatest(visible)

  // Moves the panel to `to` (1 = open, 0 = closed) from wherever it is now. The time is scaled by the distance
  // left, so closing a panel that was already dragged halfway does not take as long as closing a full one.
  const slideTo = useCallback((to: 0 | 1, from?: number, byUser = false) => {
    const go = (start: number) => {
      const full = to === 1 ? OPEN_MS : CLOSE_MS
      const ms = getReduced() ? 0 : Math.round(full * Math.max(0.35, Math.abs(to - start)))
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
        // A tap or swipe closed the menu from here: tell the screen only now that it is gone
        if (byUser) getOnClose()()
        getOnClosed()?.()
      })
    }
    if (from !== undefined) go(from)
    else t.stopAnimation(go)
  }, [t, getReduced, getOnClosed, getOnClose])

  useOnChange(visible, shown => {
    setMoving(true)
    if (shown) setMounted(true)
  })

  useEffect(() => {
    if (visible) {
      if (laidOut.current) slideTo(1)
    } else if (mounted) {
      slideTo(0)
    }
  }, [visible, mounted, slideTo])

  const onPanelLayout = useCallback(() => {
    if (laidOut.current) return
    laidOut.current = true
    // Freshly mounted, so the panel is known to be fully closed: no need to ask the native side where it is
    if (getVisible()) slideTo(1, 0)
  }, [slideTo, getVisible])

  // Tap on the dimmed area, swipe left or the back button: the menu starts sliding out on this very frame, without
  // waiting for the screen behind it to re-render (that render is what made closing feel late), and the screen
  // is told once the menu is gone.
  const dismiss = useCallback(() => {
    setMoving(true)
    slideTo(0, undefined, true)
  }, [slideTo])

  const slide = useMemo(() => t.interpolate({ inputRange: [0, 1], outputRange: [-panel - SHADOW_GAP, 0] }), [t, panel])

  // Swipe the menu to the left to close it, from the panel or from the dimmed area beside it. It follows the
  // finger from the point where the swipe was recognised (so it does not jump), and then either closes or springs back.
  const [pan] = useState(() => createDrawerPan(t, setMoving))
  useEffect(() => {
    pan.sync({ panel, reduced: reduce, close: dismiss })
  })

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Animated.View {...pan.responder.panHandlers} style={[s.scrim, { opacity: t }]}>
          <Pressable style={s.fill} onPress={dismiss} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          {...pan.responder.panHandlers}
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
