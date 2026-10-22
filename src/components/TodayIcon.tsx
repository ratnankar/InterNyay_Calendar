import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { font, theme } from '../theme'

export default function TodayIcon({ size = 24, color = theme.muted }: { size?: number; color?: string }) {
  const day = new Date().getDate()
  return (
    <View style={[s.box, { width: size, height: size, borderColor: color }]}>
      <Text style={[s.num, { color }]}>{day}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  num: { ...font.caption, fontWeight: '700', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
})
