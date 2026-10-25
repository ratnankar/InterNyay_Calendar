import { createContext } from 'react'
import { GestureResponderHandlers } from 'react-native'

// Lets the header and the scrolling body of a sheet take part in the "drag down to close" gesture owned by <Sheet>
export interface SheetDrag {
  header: GestureResponderHandlers
  body: GestureResponderHandlers
  // The body reports whether it is scrolled to the very top; only then may a downward drag close the sheet
  setAtTop: (top: boolean) => void
}

export const SheetDragContext = createContext<SheetDrag | null>(null)
