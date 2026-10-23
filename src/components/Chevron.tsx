import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { duration, ease, native, useReduceMotion } from '../motion'
import { theme } from '../theme'
import Icon, { IconName } from './Icon'

interface Props {
  open: boolean
  name?: IconName
  // How far the arrow turns when open: a down arrow flips (180), a right arrow points down (90)
  openDeg?: number
  size?: number
  color?: string
}

// The one arrow used by every expandable part, so they all turn the same way at the same speed
export default function Chevron({ open, name = 'chevronDown', openDeg = 180, size = 16, color }: Props) {
  const reduce = useReduceMotion()
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current

  useEffect(() => {
    if (reduce) { turn.setValue(open ? 1 : 0); return }
    const run = Animated.timing(turn, { toValue: open ? 1 : 0, duration: duration.base, easing: ease.standard, useNativeDriver: native })
    run.start()
    return () => run.stop()
  }, [open, reduce, turn])

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${openDeg}deg`] })
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon name={name} size={size} color={color ?? theme.brand} />
    </Animated.View>
  )
}
