import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useAnimatedValue, useLatest, useOnChange } from '../hooks'
import { useLayout } from '../layout'
import { duration, ease, native, useReduceMotion } from '../motion'
import Reveal from './Reveal'
import { SheetDrag, SheetDragContext } from './sheetDrag'
import { liftShadow, theme, makeStyles } from '../theme'

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  background?: string
}

// How far (or how fast) a downward drag must go to close the sheet
const CLOSE_DISTANCE = 110
const CLOSE_VELOCITY = 0.9

export default function Sheet({ visible, onClose, children, background }: Props) {
  const s = useS()
  const { dialog, height } = useLayout()
  const reduce = useReduceMotion()
  const y = useAnimatedValue(0)
  const atTop = useRef(true)
  // After a drag-close the sheet is already off screen, so the Modal must not slide it out a second time
  const [dragClosed, setDragClosed] = useState(false)
  const getClose = useLatest(onClose)
  const getVisible = useLatest(visible)
  const getHeight = useLatest(height)
  const getReduce = useLatest(reduce)

  // iPhone's page sheet already closes by dragging down (the system does it); everywhere else this does
  const enabled = dialog || Platform.OS !== 'ios'

  useOnChange(visible, shown => { if (shown) setDragClosed(false) })
  useEffect(() => {
    if (visible) { y.setValue(0); atTop.current = true }
  }, [visible, y])

  const drag = useMemo<SheetDrag>(() => {
    const springBack = () => Animated.timing(y, { toValue: 0, duration: getReduce() ? 0 : duration.fast, easing: ease.standard, useNativeDriver: native }).start()

    const finish = (dy: number, vy: number) => {
      if (dy > CLOSE_DISTANCE || vy > CLOSE_VELOCITY) {
        setDragClosed(true)
        Animated.timing(y, { toValue: getHeight(), duration: getReduce() ? 0 : duration.fast + 20, easing: ease.exit, useNativeDriver: native }).start(() => {
          getClose()()
          // A sheet may refuse to close (unsaved changes ask first); then it comes back instead of staying off screen
          setTimeout(() => { if (getVisible()) { setDragClosed(false); springBack() } }, 400)
        })
      } else springBack()
    }

    const handlers = {
      onPanResponderGrant: () => y.stopAnimation(),
      onPanResponderMove: (_: unknown, g: { dy: number }) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_: unknown, g: { dy: number; vy: number }) => finish(g.dy, g.vy),
      onPanResponderTerminate: () => springBack(),
    }
    const down = (g: { dx: number; dy: number }, min: number) => g.dy > min && g.dy > Math.abs(g.dx) * 1.5

    const header = PanResponder.create({ ...handlers, onMoveShouldSetPanResponder: (_, g) => enabled && down(g, 8) })
    // The body claims the touch before its scroll view does, but only for a downward drag from the very top
    const body = PanResponder.create({ ...handlers, onMoveShouldSetPanResponderCapture: (_, g) => enabled && atTop.current && down(g, 12) })
    return { header: header.panHandlers, body: body.panHandlers, setAtTop: top => { atTop.current = top } }
  }, [y, enabled, getClose, getVisible, getHeight, getReduce])

  const lift = { transform: [{ translateY: y }] }
  const overlay = Platform.OS !== 'ios'
  const dim = useMemo(() => y.interpolate({ inputRange: [0, Math.max(height, 1)], outputRange: [1, 0], extrapolate: 'clamp' }), [y, height])

  if (dialog) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait', 'landscape']}>
        <SafeAreaProvider>
          <SheetDragContext.Provider value={drag}>
            <View style={s.backdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
              <Animated.View style={[s.lift, lift]}>
                <Reveal variant="pop" style={[s.dialog, { height: Math.min(height - 48, 780), backgroundColor: background || theme.bg }]}>
                  <View style={s.fill} accessibilityViewIsModal>{children}</View>
                </Reveal>
              </Animated.View>
            </View>
          </SheetDragContext.Provider>
        </SafeAreaProvider>
      </Modal>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType={dragClosed ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={overlay}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <SafeAreaProvider>
        <SheetDragContext.Provider value={drag}>
          {overlay ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.dim, { opacity: dim }]} /> : null}
          <Animated.View style={[s.fill, lift]}>
            <SafeAreaView style={[s.root, background ? { backgroundColor: background } : null]} edges={['top', 'left', 'right']}>{children}</SafeAreaView>
          </Animated.View>
        </SheetDragContext.Provider>
      </SafeAreaProvider>
    </Modal>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, backgroundColor: theme.bg },
  lift: { width: '100%', alignItems: 'center' },
  dim: { backgroundColor: theme.scrim },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.scrim },
  dialog: { width: '100%', maxWidth: 640, borderRadius: 24, overflow: 'hidden', ...liftShadow },
}))
