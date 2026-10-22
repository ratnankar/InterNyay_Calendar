import React from 'react'
import { Platform, StyleSheet, Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps, TextStyle } from 'react-native'
import { theme } from './theme'

const BODY: Record<string, string> = {
  '400': 'SourceSans3_400Regular', '500': 'SourceSans3_500Medium', '600': 'SourceSans3_600SemiBold',
  '700': 'SourceSans3_700Bold', '800': 'SourceSans3_700Bold', '900': 'SourceSans3_700Bold',
}

const DISPLAY: Record<string, string> = Object.fromEntries(
  ['400', '500', '600', '700', '800', '900'].map(w => [w, 'PlayfairDisplay_700Bold']),
)

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" })

const WEB = Platform.OS === 'web'
const withFallback = (name: string, serif = false) => (WEB ? `${name}, ${serif ? 'Georgia, serif' : 'system-ui, -apple-system, "Segoe UI", sans-serif'}` : name)

function withFont(style: TextProps['style']): TextStyle {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle
  const weight = String(flat.fontWeight === 'bold' ? '700' : flat.fontWeight || '400')

  if (flat.fontFamily === theme.mono) return { includeFontPadding: false, ...flat, fontFamily: MONO }
  const table = flat.fontFamily === theme.display ? DISPLAY : BODY

  return { includeFontPadding: false, ...flat, fontFamily: withFallback(table[weight] || table['400'], table === DISPLAY), fontWeight: undefined }
}

const MAX_SCALE = 1.2

export function Text({ style, ...rest }: TextProps) {
  return <RNText maxFontSizeMultiplier={MAX_SCALE} {...rest} style={withFont(style)} />
}

export const TextInput = React.forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={MAX_SCALE} {...rest} style={withFont(style as TextProps['style'])} />
})
