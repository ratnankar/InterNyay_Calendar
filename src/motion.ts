import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
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

interface FadePagerInput {
  reach: number
  step: (delta: number) => void
  up?: () => void
  reduced: boolean
}

function createFadePager(x: Animated.Value, fade: Animated.Value, distance: number) {
  const input: FadePagerInput = { reach: 0, step: () => undefined, reduced: false }
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
    sync: (next: FadePagerInput) => { input.reach = next.reach; input.step = next.step; input.up = next.up; input.reduced = next.reduced },
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
export function useFadePager(order: number, onStep: (delta: number) => void, onUp?: () => void, distance = 48) {
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  const x = useAnimatedValue(0)
  const fade = useAnimatedValue(1)
  const last = useRef(order)
  const [pager] = useState(() => createFadePager(x, fade, distance))

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

export const MONTH_SPAN = 1000

// A full-width month slide takes this long, a short finish takes less
const MONTH_SLIDE = 300
const MONTH_MIN = 170
// Starts at the speed of the finger and eases to a stop
const MONTH_EASE = Easing.bezier(0.25, 0.8, 0.25, 1)

interface PagerInput {
  width: number
  rest: number
  step: (delta: number) => void
  up?: () => void
  reduced: boolean
}

// x is the strip's absolute position: month number n sits at (n - base) * width and x is always
// -(shown month - base) * width at rest, so a swipe ends exactly where the next month's own position is.
// Nothing is ever reset or re-centred afterwards (that reset landing a frame apart from the new layout was
// the flash of wrong colours), the neighbours that are mounted just move along with the shown month.
function createMonthPager(x: Animated.Value, distance: number) {
  const input: PagerInput = { width: 0, rest: 0, step: () => undefined, reduced: false }
  let pending = 0
  let busy = false
  let parked: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const settle = () => {
    const to = input.rest
    Animated.timing(x, { toValue: to, duration: duration.fast, easing: easeOut, useNativeDriver: native }).start(({ finished }) => { if (finished) x.setValue(to) })
  }

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => {
      const sideways = Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4
      const upward = !busy && !!input.up && g.dy < -14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6
      return sideways || upward
    },
    onPanResponderGrant: () => { x.stopAnimation() },
    onPanResponderMove: (_, g) => {
      if (input.reduced || input.width <= 0 || Math.abs(g.dy) > Math.abs(g.dx)) return
      x.setValue(input.rest + Math.max(-input.width, Math.min(input.width, g.dx)))
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dy) > Math.abs(g.dx)) {
        settle()
        if (g.dy <= -distance) input.up?.()
        return
      }
      const commit = Math.abs(g.dx) >= distance || (Math.abs(g.vx) > 0.35 && Math.abs(g.dx) > 16)
      if (!commit) { settle(); return }
      const dir = g.dx < 0 ? 1 : -1
      if (input.reduced || input.width <= 0) { input.step(dir); return }
      busy = true
      pending = dir
      const target = input.rest - dir * input.width
      parked = target
      // Finish from wherever the finger let go; a faster flick finishes faster
      const remaining = Math.max(0, input.width - Math.abs(g.dx))
      const fast = Math.min(1, Math.abs(g.vx) / 2)
      const ms = Math.round(Math.max(MONTH_MIN, Math.min(MONTH_SLIDE, (remaining / input.width) * MONTH_SLIDE + 90 - fast * 60)))
      // The slide runs on the native side, so the screen can change the month at the same time: nothing is left to
      // do on the JS side when the slide ends, which is what made it stutter at the end
      Animated.timing(x, { toValue: target, duration: ms, easing: MONTH_EASE, useNativeDriver: native }).start(({ finished }) => {
        if (!finished || pending === 0) return
        // Safety net: if the month did not change, bring the old one back
        timer = setTimeout(() => {
          if (pending === 0) return
          pending = 0
          busy = false
          parked = null
          settle()
        }, 600)
      })
      input.step(dir)
    },
    onPanResponderTerminate: () => settle(),
  })

  return {
    responder,
    sync: (next: PagerInput) => { input.width = next.width; input.rest = next.rest; input.step = next.step; input.up = next.up; input.reduced = next.reduced },
    // The shown month changed. True when a swipe already carried the strip to where it belongs.
    arrive: (target: number) => {
      busy = false
      pending = 0
      if (timer) { clearTimeout(timer); timer = null }
      const done = parked !== null && Math.abs(parked - target) < 0.5
      parked = null
      return done
    },
  }
}

// Month sliding, like Google Calendar: the previous, current and next month sit side by side and the whole
// strip follows the finger, so the neighbouring month slides in as the current one slides out. Nothing fades.
// Changes that do not come from a swipe (arrows, keys, pickers) glide the same way.
// `place(n)` is the left edge of month number n (year * 12 + month) inside the strip.
export function useMonthSlider(order: number, width: number, onStep: (delta: number) => void, onUp?: () => void, distance = 48) {
  const reduce = useReduceMotion()
  const x = useAnimatedValue(0)
  const [base, setBase] = useState(order)
  const lastBase = useRef(base)
  const last = useRef(order)
  const lastWidth = useRef(width)
  const [pager] = useState(() => createMonthPager(x, distance))
  // Far from where the strip started (a jump of years): start counting again from here
  if (Math.abs(order - base) > MONTH_SPAN - 3) setBase(order)
  const rest = -(order - base) * width

  useEffect(() => {
    pager.sync({ width, rest, step: onStep, up: onUp, reduced: reduce })
  })

  useLayoutEffect(() => {
    if (lastBase.current !== base) {
      lastBase.current = base
      last.current = order
      pager.arrive(rest)
      x.stopAnimation()
      x.setValue(rest)
      return
    }
    const delta = order - last.current
    const resized = lastWidth.current !== width
    last.current = order
    lastWidth.current = width
    if (delta === 0 && !resized) return
    const carried = delta !== 0 && pager.arrive(rest)
    if (carried) return
    if (reduce || resized || width <= 0 || Math.abs(delta) !== 1) { x.stopAnimation(); x.setValue(rest); return }
    Animated.timing(x, { toValue: rest, duration: MONTH_SLIDE, easing: MONTH_EASE, useNativeDriver: native }).start(({ finished }) => { if (finished) x.setValue(rest) })
  }, [order, base, reduce, width, rest, x, pager])

  // Left edge of month n inside the strip, which is MONTH_SPAN months wide on each side of the starting month so
  // that every month, including the neighbours sliding in, always lies inside the strip's own bounds
  const place = (n: number) => (n - base + MONTH_SPAN) * width
  return { x, handlers: pager.responder.panHandlers, place }
}
