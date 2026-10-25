import { useEffect, useState } from 'react'
import { Animated, Image, StyleSheet, View } from 'react-native'
import { useAnimatedValue, useOnChange } from '../hooks'
import Icon from './Icon'
import { duration, ease, native } from '../motion'
import { theme, makeStyles } from '../theme'

interface Props {
  uri?: string | null
  size?: number
}

export default function Avatar({ uri, size = 32 }: Props) {
  const s = useS()
  const [failed, setFailed] = useState(false)
  const fade = useAnimatedValue(0)

  useOnChange(uri, () => setFailed(false))
  useEffect(() => { fade.setValue(0) }, [uri, fade])

  const show = () => {
    Animated.timing(fade, { toValue: 1, duration: duration.base, easing: ease.standard, useNativeDriver: native }).start()
  }

  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="person" size={Math.round(size * 0.62)} color={theme.onBrandFill} />
      {uri && !failed ? (
        <Animated.View style={[s.photo, { opacity: fade }]}>
          <Image source={{ uri }} style={s.image} resizeMode="cover" onLoad={show} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
        </Animated.View>
      ) : null}
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.brand },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: '100%', height: '100%' },
}))
