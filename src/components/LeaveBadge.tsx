import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { font, makeStyles, theme } from '../theme'

interface Props {
  label?: string
  dot?: boolean
}

export default function LeaveBadge({ label = 'Judge on leave', dot }: Props) {
  const s = useS()
  if (dot) return <View style={s.dot} accessibilityLabel="Judge on leave" />
  return (
    <View style={s.pill} accessibilityLabel={label}>
      <View style={s.dotSmall} />
      <Text style={s.text} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 4, backgroundColor: '#fff', borderWidth: 2, borderColor: theme.danger },
  dotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.danger },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: '#fff' },
  text: { ...font.micro, fontWeight: '700', color: theme.danger },
}))
