import { Alert } from 'react-native'

// Shows what went wrong instead of the app closing. Several errors in a row show one message.
let last = 0
export function reportError(error: unknown) {
  const now = Date.now()
  if (now - last < 3000) return
  last = now
  const e = error as { message?: string } | string | undefined
  const text = (typeof e === 'string' ? e : e?.message) || 'Unknown error'
  Alert.alert('Something went wrong', text.slice(0, 500))
}

// In a release build an uncaught JavaScript error closes the app. Show the message instead and keep the app open.
// In development the normal red error screen stays.
export function installErrorGuard() {
  const utils = (globalThis as any).ErrorUtils
  if (!utils?.setGlobalHandler) return
  const previous = utils.getGlobalHandler?.()
  utils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (__DEV__ && previous) { previous(error, isFatal); return }
    reportError(error)
  })
}
