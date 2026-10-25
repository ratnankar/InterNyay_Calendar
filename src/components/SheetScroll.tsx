import { useContext } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SheetDragContext } from './sheetDrag'

interface Props extends ScrollViewProps {
  // A sheet whose body takes its own drags (a drawing pad) turns the drag-down-to-close off for the body
  dragToClose?: boolean
}

export default function SheetScroll({ children, dragToClose = true, onScroll, ...rest }: Props) {
  const insets = useSafeAreaInsets()
  const drag = useContext(SheetDragContext)
  const active = dragToClose && drag
  const track = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    drag?.setAtTop(e.nativeEvent.contentOffset.y <= 0)
    onScroll?.(e)
  }
  return (
    <View style={s.fill} {...(active ? drag.body : null)}>
      <ScrollView {...rest} onScroll={track} scrollEventThrottle={32} contentContainerStyle={[s.content, { paddingBottom: 40 + insets.bottom }]}>
        {children}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
})
