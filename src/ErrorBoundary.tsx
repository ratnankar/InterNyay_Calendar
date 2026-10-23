import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './ui'
import Tappable from './components/Tappable'
import { reportError } from './errorGuard'
import { font, makeStyles, radius, theme } from './theme'

interface Props {
  children: React.ReactNode
  // Called when something inside fails to draw. Sheets use it to close themselves.
  onError?: (error: Error) => void
  // Without a fallback the whole area shows the message and a "Try again" button; fallback={null} shows nothing
  fallback?: null
  // When this changes, the boundary tries to draw its content again
  resetKey?: unknown
}

interface State { error: Error | null }

function Message({ error, retry }: { error: Error; retry: () => void }) {
  const s = useS()
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.text}>{error.message}</Text>
      <Tappable onPress={retry} pressedScale={0.96} accessibilityRole="button" style={s.btn}>
        <Text style={s.btnText}>Try again</Text>
      </Tappable>
    </View>
  )
}

// Catches a drawing error in the part of the app inside it, so one broken screen or sheet does not take the whole app down
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error) {
    reportError(error)
    this.props.onError?.(error)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback === null) return null
    return <Message error={error} retry={() => this.setState({ error: null })} />
  }
}

const useS = makeStyles(() => StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: theme.bg },
  title: { ...font.sheetTitle, fontWeight: '700', color: theme.ink },
  text: { ...font.body, color: theme.muted, textAlign: 'center' },
  btn: { height: 40, paddingHorizontal: 20, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brand },
  btnText: { ...font.label, fontWeight: '700', color: theme.onBrandFill },
}))
