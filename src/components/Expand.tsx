import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleProp, ViewStyle } from 'react-native'
import { useAnimatedValue } from '../hooks'
import { duration, ease, native, useReduceMotion } from '../motion'

interface Props {
  open: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

// Opens and closes a block of content by animating its height and fading it, on every platform.
// LayoutAnimation does nothing on the web, so collapsible parts use this instead.
// The content is only mounted while it is open or still closing. Before and after the animation it has its natural
// height (nothing is measured or clipped), so a list inside that grows later is never cut off, and a block that
// starts open shows at its full size on the first frame.
interface Change {
  open: boolean
  reduce: boolean
  wasMounted: boolean
  wasFixed: boolean
}

export default function Expand({ open, children, style }: Props) {
  const reduce = useReduceMotion()
  const [mounted, setMounted] = useState(open)
  // true only while the height is being animated
  const [fixed, setFixed] = useState(false)
  const [change, setChange] = useState<Change | null>(null)
  const height = useAnimatedValue(0)
  const fade = useAnimatedValue(open ? 1 : 0)
  const measured = useRef(0)
  const target = useRef(-1)
  const phase = useRef<'idle' | 'opening' | 'closing'>('idle')
  const run = useRef<Animated.CompositeAnimation | null>(null)

  const animate = useCallback((to: number, show: boolean, ms: number = duration.base) => {
    run.current?.stop()
    target.current = to
    run.current = Animated.parallel([
      Animated.timing(height, { toValue: to, duration: ms, easing: ease.standard, useNativeDriver: false }),
      Animated.timing(fade, { toValue: show ? 1 : 0, duration: show ? ms : Math.min(ms, duration.fast), easing: show ? ease.standard : ease.exit, useNativeDriver: native }),
    ])
    run.current.start(({ finished }) => {
      if (!finished) return
      phase.current = 'idle'
      setFixed(false)
      if (!show) setMounted(false)
    })
  }, [height, fade])

  if (!change || change.open !== open) {
    setChange({ open, reduce, wasMounted: mounted, wasFixed: fixed })
    if (open) {
      setMounted(true)
      setFixed(!reduce)
    } else if (mounted) {
      setFixed(!reduce)
      if (reduce) setMounted(false)
    }
  }

  useEffect(() => {
    if (!change) return
    if (change.open) {
      if (change.reduce) {
        fade.setValue(1)
        phase.current = 'idle'
        return
      }
      phase.current = 'opening'
      target.current = -1
      if (!change.wasMounted) {
        // Starts closed; onLayout below measures the content and runs the animation
        height.setValue(0)
        fade.setValue(0)
      } else if (measured.current > 0) {
        animate(measured.current, true)
      }
    } else if (change.wasMounted) {
      if (change.reduce) {
        phase.current = 'idle'
        return
      }
      phase.current = 'closing'
      if (!change.wasFixed) height.setValue(measured.current)
      animate(0, false)
    }
  }, [change, animate, height, fade])

  useEffect(() => () => run.current?.stop(), [])

  const onLayout = (h: number) => {
    measured.current = h
    // The first measurement starts the animation; a later one (content that re-flowed while opening) only
    // re-aims it quickly, so the block never restarts from the beginning
    if (phase.current === 'opening' && h > 0 && Math.abs(h - target.current) > 0.5) animate(h, true, target.current < 0 ? duration.base : duration.fast)
  }

  if (!mounted) return null
  return (
    <Animated.View style={[style, fixed ? { height, overflow: 'hidden' } : null]}>
      <Animated.View
        style={[{ opacity: fade }, fixed ? { position: 'absolute', top: 0, left: 0, right: 0 } : null]}
        onLayout={e => onLayout(e.nativeEvent.layout.height)}
      >
        {children}
      </Animated.View>
    </Animated.View>
  )
}
