import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'

export function useAnimatedValue(initial: number) {
  const [value] = useState(() => new Animated.Value(initial))
  return value
}

export function useLatest<T>(value: T): () => T {
  const ref = useRef(value)
  useLayoutEffect(() => { ref.current = value })
  return useCallback(() => ref.current, [])
}

export function useOnChange<T>(value: T, onChange: (value: T, previous: T) => void) {
  const [previous, setPrevious] = useState(value)
  if (!Object.is(previous, value)) {
    setPrevious(value)
    onChange(value, previous)
  }
}
