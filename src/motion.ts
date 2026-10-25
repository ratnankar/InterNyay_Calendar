import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, PanResponder, Platform, useWindowDimensions } from 'react-native'
import { useAnimatedValue } from './hooks'

export const native = Platform.OS !== 'web'

export const duration = { fast: 140, base: 240, slow: 420 }

// One set of curves for the whole app, so every surface accelerates and settles the same way
export const ease = {
  // Things that resize or move inside a screen: expanding cards, list reveals, month slides, chevrons
  standard: Easing.bezier(0.2, 0, 0, 1),
  // Large surfaces arriving (the menu panel): quick start, long soft landing
  enter: Easing.bezier(0.05, 0.7, 0.1, 1),
  // Surfaces and content leaving: a gentle pick-up
  exit: Easing.bezier(0.4, 0, 1, 1),
}

const easeOut = ease.standard

// Kept outside React so plain functions (animateLayout) can honour the phone's reduce-motion setting too
let reduced = false
const reduceListeners = new Set<() => void>()
const setReduced = (v: boolean) => {
  if (v === reduced) return
  reduced = v
  reduceListeners.forEach(l => l())
}
AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined)
AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
const subscribeReduced = (l: () => void) => { reduceListeners.add(l); return () => { reduceListeners.delete(l) } }

// Call just before a state change that adds, removes or moves views, so they glide instead of jumping
export function animateLayout(ms: number = duration.base) {
  if (reduced) return
  LayoutAnimation.configureNext({
    duration: ms,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  })
}

// Entry delay for list rows: the first few cascade in, later ones appear together so long lists stay quick
export const stagger = (index: number, step = 24, max = 6) => Math.min(index, max) * step

export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => reduced, () => false)
}

export function useSlideIn(order: number, fadeFrom = 0.3) {
  const reduce = useReduceMotion()
  const shift = useAnimatedValue(0)
  const fade = useAnimatedValue(1)
  const last = useRef(order)

  useEffect(() => {
    if (last.current === order) return
    const direction = order > last.current ? 1 : -1
    last.current = order
    if (reduce) return
    shift.setValue(direction * 28)
    fade.setValue(fadeFrom)
    Animated.parallel([
      Animated.timing(shift, { toValue: 0, duration: duration.base, easing: easeOut, useNativeDriver: native }),
      Animated.timing(fade, { toValue: 1, duration: duration.base, easing: easeOut, useNativeDriver: native }),
    ]).start()
  }, [order, reduce, fadeFrom, shift, fade])

  return { opacity: fade, transform: [{ translateX: shift }] }
}

interface PagerInput {
  reach: number
  step: (delta: number) => void
  up?: () => void
  reduced: boolean
}

function createMonthPager(x: Animated.Value, fade: Animated.Value, distance: number) {
  const input: PagerInput = { reach: 0, step: () => undefined, reduced: false }
  let pending = 0
  let busy = false

  const settle = () => {
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: duration.fast, easing: easeOut, useNativeDriver: native }),
      Animated.timing(fade, { toValue: 1, duration: duration.fast, easing: easeOut, useNativeDriver: native }),
    ]).start()
  }

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => {
      if (busy) return false
      const sideways = Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6
      const upward = !!input.up && g.dy < -14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6
      return sideways || upward
    },
    onPanResponderMove: (_, g) => {
      if (input.reduced || Math.abs(g.dy) > Math.abs(g.dx)) return
      x.setValue(g.dx * 0.55)
      fade.setValue(1 - Math.min(0.45, Math.abs(g.dx) / 400))
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dy) > Math.abs(g.dx)) {
        settle()
        if (g.dy <= -distance) input.up?.()
        return
      }
      const commit = Math.abs(g.dx) >= distance || (Math.abs(g.vx) > 0.5 && Math.abs(g.dx) > 20)
      if (!commit) { settle(); return }
      const dir = g.dx < 0 ? 1 : -1
      if (input.reduced) { input.step(dir); return }
      busy = true
      pending = dir
      Animated.parallel([
        Animated.timing(x, { toValue: -dir * input.reach, duration: 110, easing: ease.exit, useNativeDriver: native }),
        Animated.timing(fade, { toValue: 0, duration: 110, easing: ease.exit, useNativeDriver: native }),
      ]).start(() => {
        input.step(dir)
        // Safety net: if the month did not change, bring the old one back
        setTimeout(() => {
          if (pending === 0) return
          pending = 0
          busy = false
          x.setValue(0)
          fade.setValue(1)
        }, 600)
      })
    },
    onPanResponderTerminate: () => settle(),
  })

  return {
    responder,
    sync: (next: PagerInput) => { input.reach = next.reach; input.step = next.step; input.up = next.up; input.reduced = next.reduced },
    arrive: () => {
      busy = false
      const fromSwipe = pending !== 0
      pending = 0
      return { fromSwipe, reach: input.reach }
    },
  }
}

// Month swiping: the month follows the finger, slides out when released, then the next month slides in.
// Changes that do not come from a swipe (arrows, keys, pickers) get a short slide-in instead.
export function useMonthPager(order: number, onStep: (delta: number) => void, onUp?: () => void, distance = 48) {
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  const x = useAnimatedValue(0)
  const fade = useAnimatedValue(1)
  const last = useRef(order)
  const [pager] = useState(() => createMonthPager(x, fade, distance))

  useEffect(() => {
    pager.sync({ reach: Math.min(120, width * 0.3), step: onStep, up: onUp, reduced: reduce })
  })

  useEffect(() => {
    if (last.current === order) return
    const direction = order > last.current ? 1 : -1
    last.current = order
    const { fromSwipe, reach } = pager.arrive()
    if (reduce) { x.setValue(0); fade.setValue(1); return }
    x.setValue(direction * (fromSwipe ? reach : 28))
    fade.setValue(fromSwipe ? 0 : 0.3)
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: duration.base, easing: easeOut, useNativeDriver: native }),
      Animated.timing(fade, { toValue: 1, duration: duration.base, easing: easeOut, useNativeDriver: native }),
    ]).start()
  }, [order, reduce, x, fade, pager])

  return { style: { opacity: fade, transform: [{ translateX: x }] }, handlers: pager.responder.panHandlers }
}
