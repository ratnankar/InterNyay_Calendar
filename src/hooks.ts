import { RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
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

interface Scrollable {
  scrollTo: (options: { y: number; animated: boolean }) => void
}

export function useHandScroll(list: RefObject<Scrollable | null>, offset: RefObject<number>) {
  const pan = useRef({ base: 0, from: 0 })
  const begin = useCallback((dy: number) => { pan.current = { base: dy, from: offset.current } }, [offset])
  const target = useCallback((dy: number) => Math.max(0, pan.current.from - (dy - pan.current.base)), [])
  const scrollTo = useCallback((y: number, animated: boolean) => { list.current?.scrollTo({ y, animated }) }, [list])
  return { begin, target, scrollTo }
}
