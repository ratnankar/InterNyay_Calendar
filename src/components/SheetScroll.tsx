import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function SheetScroll({ children, ...rest }: ScrollViewProps) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView {...rest} contentContainerStyle={[s.content, { paddingBottom: 40 + insets.bottom }]}>
      {children}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
})
