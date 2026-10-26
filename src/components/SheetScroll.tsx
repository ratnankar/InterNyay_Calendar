import { useContext, useMemo, useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, PanResponder, Platform, ScrollView, ScrollViewInstance, ScrollViewProps, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHandScroll, useLatest } from '../hooks'
import { SheetDragContext } from './sheetDrag'

interface Props extends ScrollViewProps {
  // A sheet whose body takes its own drags (a drawing pad) turns the drag-down-to-close off for the body
  dragToClose?: boolean
}

// Android: a long list's own scroll view claims every vertical drag in native code, before the sheet's drag-down-to-close can
// see it, so a busy day could not be slid shut from the list. While the list sits at the very top its native scrolling is
// therefore switched off: a downward drag then reaches the sheet, and an upward drag is turned into scrolling here (with a short
// glide on release). Once the list has moved off the top, the normal native scrolling is back.
const HAND_SCROLL = Platform.OS === 'android'
const CLAIM = 6
const GLIDE_MS = 240

export default function SheetScroll({ children, dragToClose = true, onScroll, scrollEnabled = true, ...rest }: Props) {
  const insets = useSafeAreaInsets()
  const drag = useContext(SheetDragContext)
  const active = dragToClose && drag
  const list = useRef<ScrollViewInstance>(null)
  const offset = useRef(0)
  const [atTop, setAtTop] = useState(true)
  const lock = !!active && HAND_SCROLL && atTop
  const getLock = useLatest(lock)

  const track = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    offset.current = y
    drag?.setAtTop(y <= 0)
    setAtTop(y <= 0)
    onScroll?.(e)
  }

  // Upward drag from the top while native scrolling is off: scroll by hand. The handlers stay attached all the time (they only
  // claim a drag while the list is locked) so a drag that started at the top keeps being followed after the list has moved off it
  const { begin, target, scrollTo } = useHandScroll(list, offset)

  const hand = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => getLock() && g.dy < -CLAIM && -g.dy > Math.abs(g.dx) * 1.5,
    onPanResponderGrant: (_, g) => begin(g.dy),
    onPanResponderMove: (_, g) => scrollTo(target(g.dy), false),
    onPanResponderRelease: (_, g) => scrollTo(Math.max(0, target(g.dy) - g.vy * GLIDE_MS), true),
  }), [getLock, begin, target, scrollTo])

  return (
    <View style={s.fill} {...(active ? drag.body : null)}>
      <View style={s.fill} {...(active && HAND_SCROLL ? hand.panHandlers : null)}>
        <ScrollView
          {...rest}
          ref={list}
          scrollEnabled={scrollEnabled && !lock}
          onScroll={track}
          scrollEventThrottle={32}
          contentContainerStyle={[s.content, { paddingBottom: 40 + insets.bottom }]}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
})
