import { useState } from 'react'
import { Animated } from 'react-native'

/**
 * Stable Animated.Value that survives re-renders, without a ref.
 * `useRef(new Animated.Value(x)).current` allocates a new value on every render and then
 * throws it away; this only allocates once. Same runtime behaviour, no wasted allocations,
 * and it satisfies the React Compiler rule (refs are not read during render).
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [v] = useState(() => new Animated.Value(initial))
  return v
}