import React, { useEffect, useRef } from 'react'
import { Animated, StyleProp, ViewStyle } from 'react-native'
import { duration, easeOut, easePop, native, useReduceMotion } from '../motion'

interface Props {
  children: React.ReactNode
  variant?: 'rise' | 'pop' | 'fade'
  delay?: number
  // Show at once without animating (used when a list is replaced by another motion, such as stepping to the next day)
  skip?: boolean
  style?: StyleProp<ViewStyle>
}

export default function Reveal({ children, variant = 'rise', delay = 0, skip = false, style }: Props) {
  const reduce = useReduceMotion()
  const progress = useRef(new Animated.Value(skip ? 1 : 0)).current
  // Plays once when it first appears. Later changes of delay or variant (a list that re-sorts or filters)
  // must not stop it half way and start it again, which showed as a stutter
  const first = useRef({ delay, variant, skip })

  useEffect(() => {
    const { delay: wait, variant: kind, skip: instant } = first.current
    if (reduce || instant) {
      progress.setValue(1)
      return
    }
    const run = Animated.timing(progress, {
      toValue: 1,
      delay: wait,
      duration: duration.base,
      easing: kind === 'pop' ? easePop : easeOut,
      useNativeDriver: native,
    })
    run.start()
    return () => run.stop()
  }, [reduce, progress])

  const transform =
    variant === 'rise' ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }]
    : variant === 'pop' ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }]
    : []

  return <Animated.View style={[style, { opacity: progress, transform }]}>{children}</Animated.View>
}
