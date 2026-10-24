import { Platform } from 'react-native'

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''

let mod: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy: the native module throws at import time on web
  if (Platform.OS !== 'web' && WEB_CLIENT_ID) mod = require('@react-native-google-signin/google-signin')
} catch { mod = null }

export const googleAvailable = !!mod

export function googleUnavailableReason(): string {
  if (Platform.OS === 'web') return 'Google sign-in works in the phone app, not in the browser. Use your email and password here.'
  if (!WEB_CLIENT_ID) return 'Google sign-in is not set up yet: add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the .env file and restart with: npx expo start -c'
  return 'Google sign-in needs a development build (it does not run in Expo Go). Install @react-native-google-signin/google-signin and build the app, see the README.'
}

let configured = false
function configure() {
  if (configured || !mod) return
  mod.GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
    scopes: ['email', 'profile'],
  })
  configured = true
}

export class GoogleCancelled extends Error {}

export async function googleIdToken(): Promise<string> {
  if (!mod) throw new Error('Google sign-in is not set up in this build.')
  configure()
  const { GoogleSignin, statusCodes } = mod
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

    try { await GoogleSignin.signOut() } catch { }
    const res = await GoogleSignin.signIn()
    if (res?.type === 'cancelled') throw new GoogleCancelled()
    const token = res?.data?.idToken ?? res?.idToken
    if (!token) throw new Error('Google did not return an ID token. Check the web client id.')
    return token
  } catch (e: any) {
    if (e instanceof GoogleCancelled || e?.code === statusCodes?.SIGN_IN_CANCELLED) throw new GoogleCancelled()
    if (e?.code === statusCodes?.IN_PROGRESS) throw new GoogleCancelled()
    // Android "developer error" (code 10 / 28444): the build's signing SHA-1 or package name is not in the Android OAuth client
    if (/28444|DEVELOPER_ERROR|developer console/i.test(`${e?.code ?? ''} ${e?.message ?? ''}`) || String(e?.code) === '10') {
      throw new Error('Google sign-in is not set up for this build yet (developer error). Add this build\'s SHA-1 for com.internyay.calendar to an Android OAuth client in Google Cloud.')
    }
    throw e
  }
}

export async function googleSignOut(): Promise<void> {
  if (!mod) return
  try { configure(); await mod.GoogleSignin.signOut() } catch { }
}