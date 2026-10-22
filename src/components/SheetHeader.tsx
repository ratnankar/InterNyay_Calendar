import { StyleSheet, View } from 'react-native'
import { Text } from '../ui'
import { font, makeStyles, radius, theme } from '../theme'
import { useLayout } from '../layout'
import IconButton from './IconButton'

interface Props {
  title: string
  subtitle?: string
  badge?: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function SheetHeader({ title, subtitle, badge, onClose, onPrev, onNext }: Props) {
  const s = useS()
  const { dialog } = useLayout()
  return (
    <View style={[s.wrap, dialog && s.wrapDialog]}>
      {dialog ? null : <View style={s.grabber} />}
      <View style={s.row}>
        <View style={s.text}>
          <Text style={s.title} numberOfLines={2}>{title}</Text>
          {subtitle || badge ? (
            <View style={s.meta}>
              {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
              {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
            </View>
          ) : null}
        </View>
        {onPrev ? <IconButton icon="chevronLeft" label="Previous day" tone="plain" size={36} onPress={onPrev} /> : null}
        {onNext ? <IconButton icon="chevronRight" label="Next day" tone="plain" size={36} onPress={onNext} /> : null}
        <IconButton icon="close" label="Close" tone="plain" onPress={onClose} />
      </View>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.line, paddingBottom: 14 },
  wrapDialog: { paddingTop: 16 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.line, marginTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
  text: { flex: 1, marginRight: 8 },
  title: { ...font.sheetTitle, fontWeight: '700', color: theme.ink, fontFamily: theme.display },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  sub: { ...font.small, color: theme.muted },
  badge: { backgroundColor: theme.blueSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { ...font.caption, fontWeight: '700', color: theme.brand },
}))
