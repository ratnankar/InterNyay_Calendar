import React, { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSettings } from './SettingsContext'
import { applyScheme, Scheme, ThemeContext } from './theme'
import { applyWebScheme } from './webStyles'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const device = useColorScheme()
  const scheme: Scheme = settings.appearance === 'system' ? (device === 'dark' ? 'dark' : 'light') : settings.appearance

  applyScheme(scheme)
  useEffect(() => { applyWebScheme(scheme) }, [scheme])

  return (
    <ThemeContext.Provider value={scheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  )
}
