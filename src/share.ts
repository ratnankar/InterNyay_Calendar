import { Platform, Share } from 'react-native'

// Hands text to the phone's share sheet. In the browser it uses the share dialog when asked and the browser has one,
// otherwise it copies to the clipboard. Errors (also the user closing the sheet) are left to the caller.
export async function shareText(text: string, opts: { webShare?: boolean } = {}): Promise<'shared' | 'copied' | 'none'> {
  if (Platform.OS !== 'web') {
    await Share.share({ message: text })
    return 'shared'
  }
  const nav = (globalThis as any).navigator
  if (opts.webShare && nav?.share) { await nav.share({ text }); return 'shared' }
  if (nav?.clipboard) { await nav.clipboard.writeText(text); return 'copied' }
  return 'none'
}
