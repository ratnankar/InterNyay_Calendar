import React, { useEffect, useRef, useState } from 'react'
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native'
import { native, useReduceMotion } from '../motion'
import { useAnimatedValue } from '../useAnimatedValue'

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  pressedScale?: number
  hoverStyle?: StyleProp<ViewStyle>
  // Chips and pills pass their selected state so they give a small pop when they become selected
  selected?: boolean
}

export default function Tappable({ children, style, containerStyle, pressedScale = 0.97, hoverStyle, selected, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useAnimatedValue(1)
  const reduce = useReduceMotion()
  const [hover, setHover] = useState(false)
  const pop = useAnimatedValue(1)
  const wasSelected = useRef(selected)

  useEffect(() => {
    const turnedOn = selected === true && wasSelected.current === false
    wasSelected.current = selected
    if (!turnedOn || reduce) return
    pop.setValue(0.9)
    Animated.spring(pop, { toValue: 1, speed: 22, bounciness: 9, useNativeDriver: native }).start()
  }, [selected, reduce, pop])

  const spring = (toValue: number) => {
    if (reduce) return
    Animated.spring(scale, { toValue, speed: 60, bounciness: 0, useNativeDriver: native }).start()
  }

  const hoverProps = hoverStyle ? { onHoverIn: () => setHover(true), onHoverOut: () => setHover(false) } : null

  return (
    <Pressable
      {...rest}
      {...hoverProps}
      style={containerStyle}
      onPressIn={(e: GestureResponderEvent) => { spring(pressedScale); onPressIn?.(e) }}
      onPressOut={(e: GestureResponderEvent) => { spring(1); onPressOut?.(e) }}
    >
      <Animated.View style={[style, hover ? hoverStyle : null, { transform: selected === undefined ? [{ scale }] : [{ scale }, { scale: pop }] }]}>{children}</Animated.View>
    </Pressable>
  )
}