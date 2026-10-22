import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display'
import { SourceSans3_400Regular, SourceSans3_500Medium, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3'
import { AuthProvider, useAuth } from './src/AuthContext'
import { NotesProvider } from './src/NotesContext'
import { SettingsProvider } from './src/SettingsContext'
import { ThemeProvider } from './src/ThemeProvider'
import Reveal from './src/components/Reveal'
import HomeScreen from './src/screens/HomeScreen'
import LoginScreen from './src/screens/LoginScreen'
import { radius, theme } from './src/theme'
import { installWebStyles } from './src/webStyles'

installWebStyles()

function Root() {
  const { session, loading } = useAuth()

  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
    PlayfairDisplay_700Bold,
    SourceSans3_400Regular, SourceSans3_500Medium, SourceSans3_600SemiBold, SourceSans3_700Bold,
  })

  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <View style={s.splash}>
        <Reveal variant="pop">
          <Image source={require('./assets/logo.png')} style={s.logo} accessibilityLabel="InterNyay logo" />
        </Reveal>
        <ActivityIndicator color={theme.gold} />
      </View>
    )
  }

  return (
    <Reveal variant="fade" style={s.fill} key={session ? session.token : 'guest'}>
      {session ? <HomeScreen token={session.token} /> : <LoginScreen />}
    </Reveal>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <NotesProvider>
              <Root />
            </NotesProvider>
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: theme.navy },
  logo: { width: 96, height: 96, borderRadius: radius.lg + 4 },
})
