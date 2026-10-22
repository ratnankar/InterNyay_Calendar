import { StyleSheet, View } from 'react-native'
import { holidayCourtOf } from '../holidays'
import { Holiday } from '../types'
import { HOLIDAY_COLOURS } from '../theme'

export default function HolidayFill({ holiday }: { holiday: Holiday }) {
  const c = holidayCourtOf(holiday)
  if (c === 'BOTH') {
    return (
      <View style={s.fill} pointerEvents="none">
        <View style={s.districtHalf} />
        <View style={s.highHalf} />
      </View>
    )
  }
  return <View style={[s.fill, { backgroundColor: HOLIDAY_COLOURS[c].solid }]} pointerEvents="none" />
}

const s = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  districtHalf: { flex: 1, backgroundColor: HOLIDAY_COLOURS.DISTRICT.solid },
  highHalf: { flex: 1, backgroundColor: HOLIDAY_COLOURS.HIGH.solid },
})
