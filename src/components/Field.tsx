import React, { useRef } from 'react'
import { Animated, StyleSheet, TextInput as RNTextInput, TextInputFocusEvent, TextInputProps } from 'react-native'
import { TextInput } from '../ui'
import { duration, ease } from '../motion'
import { font, radius, theme, makeStyles } from '../theme'

interface Props extends Omit<TextInputProps, 'style'> {
  right?: React.ReactNode
  invalid?: boolean
}

const Field = React.forwardRef<React.ComponentRef<typeof RNTextInput>, Props>(function Field({ right, invalid, onFocus, onBlur, ...rest }, ref) {
  const s = useS()
  const focus = useRef(new Animated.Value(0)).current

  const move = (toValue: number) => {
    Animated.timing(focus, { toValue, duration: duration.fast, easing: ease.standard, useNativeDriver: false }).start()
  }

  const borderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [invalid ? theme.danger : theme.inputLine, theme.brand],
  })

  return (
    <Animated.View style={[s.bar, rest.multiline ? s.barMulti : s.barSingle, { borderColor }]}>
      <TextInput
        {...rest}
        ref={ref}
        style={[s.input, rest.multiline ? s.inputMulti : s.inputSingle]}
        placeholderTextColor={theme.faint}
        onFocus={(e: TextInputFocusEvent) => { move(1); onFocus?.(e) }}
        onBlur={(e: TextInputFocusEvent) => { move(0); onBlur?.(e) }}
      />
      {right}
    </Animated.View>
  )
})

export default Field

const useS = makeStyles(() => StyleSheet.create({
  bar: { flexDirection: 'row', borderWidth: 1.5, borderRadius: radius.sm + 2, backgroundColor: theme.card },
  barSingle: { alignItems: 'center', height: 48 },
  barMulti: { alignItems: 'stretch', minHeight: 220 },

  input: { flex: 1, paddingHorizontal: 14, ...font.entry, color: theme.ink },
  inputSingle: { height: '100%' },
  inputMulti: { paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
}))
