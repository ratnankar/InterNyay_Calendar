import { StyleSheet } from 'react-native'
import { theme } from '../theme'
import Icon, { IconName } from './Icon'
import Tappable from './Tappable'

interface Props {
  icon: IconName
  label: string
  onPress: () => void
  tone?: 'soft' | 'plain' | 'danger'
  size?: number
  disabled?: boolean
  color?: string
}

const tones = () => ({
  soft: { box: { backgroundColor: theme.brandSoft, borderColor: theme.line }, ink: theme.ink, hover: { backgroundColor: theme.hoverStrong } },
  plain: { box: { backgroundColor: 'transparent', borderColor: 'transparent' }, ink: theme.muted, hover: { backgroundColor: theme.hoverTint } },
  danger: { box: { backgroundColor: theme.dangerSoft, borderColor: theme.dangerLine }, ink: theme.danger, hover: { backgroundColor: theme.dangerHover } },
})

export default function IconButton({ icon, label, onPress, tone = 'soft', size = 40, disabled, color }: Props) {
  const t = tones()[tone]
  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      hitSlop={size < 44 ? 6 : 0}
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      hoverStyle={color ? s.hoverOnColour : t.hover}
      style={[s.base, t.box, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Icon name={icon} size={Math.round(size * 0.6)} color={color || t.ink} />
    </Tappable>
  )
}

const s = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hoverOnColour: { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
})
