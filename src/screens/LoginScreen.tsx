import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '../ui'
import { useAuth } from '../AuthContext'
import Field from '../components/Field'
import Icon from '../components/Icon'
import IconButton from '../components/IconButton'
import Reveal from '../components/Reveal'
import Tappable from '../components/Tappable'
import { useLayout } from '../layout'
import { GoogleCancelled, googleAvailable, googleUnavailableReason } from '../googleAuth'
import { native, useReduceMotion } from '../motion'
import { cardShadow, font, makeStyles, radius, theme, useScheme, withAlpha } from '../theme'

type AccountType = 'ADVOCATE' | 'ASSOCIATE'

export default function LoginScreen() {
  const s = useS()
  const { signIn, signInWithGoogle, notice } = useAuth()
  const insets = useSafeAreaInsets()
  const reduce = useReduceMotion()
  const { docked } = useLayout()
  const scheme = useScheme()
  const passwordRef = useRef<React.ComponentRef<typeof RNTextInput>>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [gBusy, setGBusy] = useState(false)
  const [error, setError] = useState('')
  const [needType, setNeedType] = useState(false)
  const [type, setType] = useState<AccountType>('ADVOCATE')
  const shake = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!error || reduce) return
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: native }),
      Animated.timing(shake, { toValue: -8, duration: 80, useNativeDriver: native }),
      Animated.timing(shake, { toValue: 5, duration: 70, useNativeDriver: native }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: native }),
    ]).start()
  }, [error, reduce, shake])

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password'); return }
    setBusy(true); setError('')
    try {
      await signIn(email, password, needType ? type : undefined)
    } catch (e: any) {
      const msg: string = e?.message || 'Could not sign in'
      if (/advocate and an associate/i.test(msg)) {
        setNeedType(true)
        setError('This email has an advocate and an associate account. Choose one and sign in again.')
      } else setError(msg)
    } finally { setBusy(false) }
  }

  const submitGoogle = async () => {
    if (!googleAvailable) { setError(googleUnavailableReason()); return }
    setGBusy(true); setError('')
    try {
      await signInWithGoogle(needType ? type : undefined)
    } catch (e: any) {
      if (e instanceof GoogleCancelled) return
      const msg: string = e?.message || 'Could not sign in with Google'
      if (/advocate and an associate/i.test(msg)) {
        setNeedType(true)
        setError('This email has an advocate and an associate account. Choose one and tap Google again.')
      } else setError(msg)
    } finally { setGBusy(false) }
  }

  const anyBusy = busy || gBusy
  const showGoogle = googleAvailable || Platform.OS !== 'web'

  const form = (
    <>
      <Reveal delay={180}>
        <Animated.View style={[s.card, { transform: [{ translateX: shake }] }]}>
          {notice ? <Text style={s.notice}>{notice}</Text> : null}

          <Text style={s.label}>Email</Text>
          <View style={s.gap}>
            <Field
              value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" textContentType="username" autoComplete="email" placeholder="you@example.com"
              returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} blurOnSubmit={false}
              invalid={!!error && !email.trim()}
            />
          </View>

          <Text style={s.label}>Password</Text>
          <View style={s.gapLarge}>
            <Field
              ref={passwordRef}
              value={password} onChangeText={setPassword} secureTextEntry={!show}
              autoCapitalize="none" autoCorrect={false} textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit}
              placeholder="Password" invalid={!!error && !password}
              right={<IconButton icon={show ? 'eyeOff' : 'eye'} label={show ? 'Hide password' : 'Show password'} tone="plain" size={44} onPress={() => setShow(v => !v)} />}
            />
          </View>

          {needType ? (
            <Reveal variant="fade">
              <View style={s.types}>
                {(['ADVOCATE', 'ASSOCIATE'] as const).map(t => (
                  <Tappable
                    key={t}
                    onPress={() => setType(t)}
                    pressedScale={0.96}
                    accessibilityRole="button"
                    accessibilityState={{ selected: type === t }}
                    containerStyle={s.typeSlot}
                    style={[s.type, type === t && s.typeOn]}
                  >
                    {type === t ? <Icon name="check" size={16} color={theme.ink} /> : null}
                    <Text style={[s.typeText, type === t && s.typeTextOn]}>{t === 'ADVOCATE' ? 'Advocate' : 'Associate'}</Text>
                  </Tappable>
                ))}
              </View>
            </Reveal>
          ) : null}

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Tappable onPress={submit} disabled={anyBusy} accessibilityRole="button" accessibilityLabel="Sign in" style={[s.btn, anyBusy && s.busy]}>
            {busy ? <ActivityIndicator color={theme.navy} /> : <Text style={s.btnText}>Sign in</Text>}
          </Tappable>

          {showGoogle ? (
            <>
              <View style={s.divider}>
                <View style={s.dividerLine} /><Text style={s.dividerText}>or</Text><View style={s.dividerLine} />
              </View>

              <Tappable onPress={submitGoogle} disabled={anyBusy} accessibilityRole="button" accessibilityLabel="Continue with Google" style={[s.gBtn, anyBusy && s.busy]}>
                {gBusy ? <ActivityIndicator color={theme.ink} /> : (
                  <>
                    <Image source={require('../../assets/google-g.png')} style={s.gLogo} accessibilityIgnoresInvertColors />
                    <Text style={s.gText}>Continue with Google</Text>
                  </>
                )}
              </Tappable>
            </>
          ) : null}
        </Animated.View>
      </Reveal>
    </>
  )

  const features = [
    'Every hearing across your courts, in one calendar',
    'Court holidays and no-hearing dates marked for you',
    'Your notes and court colours follow your account',
  ]

  if (docked) {
    return (
      <View style={s.splitRoot}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View style={s.splitBrand}>
          <Reveal variant="pop">
            <Image source={require('../../assets/logo.png')} style={[s.logo, s.logoLeft]} accessibilityLabel="InterNyay logo" />
          </Reveal>
          <Reveal delay={90}>
            <Text style={[s.brand, s.brandLeft]}>InterNyay Calendar</Text>
            <Text style={[s.tag, s.brandLeft]}>Your court hearings</Text>
          </Reveal>
          <Reveal delay={200}>
            <View style={s.features}>
              {features.map(f => (
                <View key={f} style={s.feature}>
                  <View style={s.featureDot} />
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </Reveal>
        </View>
        <KeyboardAvoidingView style={s.splitForm} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.splitScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.splitColumn}>
              <Text style={s.welcome}>Sign in</Text>
              <Text style={s.welcomeSub}>Use your InterNyay account.</Text>
              {form}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.band, { paddingTop: insets.top + 28 }]}>
            <Reveal variant="pop">
              <Image source={require('../../assets/logo.png')} style={s.logo} accessibilityLabel="InterNyay logo" />
            </Reveal>
            <Reveal delay={90}>
              <Text style={s.brand}>InterNyay Calendar</Text>
              <Text style={s.tag}>Your court hearings</Text>
            </Reveal>
          </View>

          <View style={s.column}>
            {form}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const useS = makeStyles(() => StyleSheet.create({
  splitRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.bg },
  splitBrand: { flex: 1, maxWidth: 560, backgroundColor: theme.navy, justifyContent: 'center', paddingHorizontal: 56, gap: 4 },
  logoLeft: { alignSelf: 'flex-start' },
  brandLeft: { textAlign: 'left' },
  features: { marginTop: 36, gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gold },
  featureText: { flex: 1, ...font.text, color: theme.onBrandMuted },
  splitForm: { flex: 1 },
  splitScroll: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  splitColumn: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  welcome: { ...font.hero, fontWeight: '700', color: theme.ink, fontFamily: theme.display },
  welcomeSub: { ...font.body, color: theme.muted, marginTop: 2, marginBottom: 20 },
  root: { flex: 1, backgroundColor: theme.bg },
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  band: { alignItems: 'center', backgroundColor: theme.navy, paddingBottom: 72, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logo: { width: 84, height: 84, borderRadius: 22, alignSelf: 'center', marginBottom: 14, borderWidth: 1, borderColor: withAlpha(theme.gold, 0.45) },
  brand: { ...font.hero, fontWeight: '700', color: theme.onBrand, textAlign: 'center', fontFamily: theme.display },
  tag: { ...font.body, color: theme.onBrandMuted, textAlign: 'center', marginTop: 2 },
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 20, marginTop: -48 },
  card: { backgroundColor: theme.card, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: theme.line, ...cardShadow },
  notice: { color: theme.goldDark, backgroundColor: theme.goldSoft, borderRadius: radius.sm, padding: 10, marginBottom: 14, ...font.small },
  label: { ...font.label, fontWeight: '500', color: theme.ink, marginBottom: 6 },
  gap: { marginBottom: 14 },
  gapLarge: { marginBottom: 18 },
  types: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeSlot: { flex: 1 },
  type: { flexDirection: 'row', gap: 6, borderWidth: 1.5, borderColor: theme.line, borderRadius: radius.sm + 2, height: 44, alignItems: 'center', justifyContent: 'center' },
  typeOn: { borderColor: theme.gold, backgroundColor: theme.goldSoft },
  typeText: { color: theme.muted, fontWeight: '600', ...font.body },
  typeTextOn: { color: theme.ink },
  error: { color: theme.danger, marginBottom: 14, ...font.small },
  btn: { backgroundColor: theme.goldBtn, borderRadius: radius.sm + 2, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: theme.navy, fontWeight: '700', ...font.label },
  busy: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.line },
  dividerText: { color: theme.muted, ...font.small },
  gBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.sm + 2, height: 48, borderWidth: 1.5, borderColor: theme.inputLine, backgroundColor: theme.card },
  gLogo: { width: 18, height: 18 },
  gText: { color: theme.ink, fontWeight: '600', ...font.label },
}))
