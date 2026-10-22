import { useEffect } from 'react'
import { Animated, Easing, StyleProp, StyleSheet, ViewStyle } from 'react-native'
import { native, useReduceMotion } from '../motion'
import { theme, makeStyles } from '../theme'

// All placeholders on screen share one pulse, so they breathe together and only one animation runs
const pulse = new Animated.Value(0.55)
let users = 0
let loop: Animated.CompositeAnimation | null = null

function retain() {
  if (users++ > 0) return
  loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0.55, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]),
  )
  loop.start()
}

function release() {
  if (--users > 0) return
  loop?.stop()
  loop = null
}

export default function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const s = useS()
  const reduce = useReduceMotion()

  useEffect(() => {
    if (reduce) return
    retain()
    return release
  }, [reduce])

  return <Animated.View style={[s.block, style, { opacity: reduce ? 0.8 : pulse }]} />
}

const useS = makeStyles(() => StyleSheet.create({
  block: { backgroundColor: theme.skeleton, borderRadius: 14 },
}))
