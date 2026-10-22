import React from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { theme } from '../theme'

type Glyph = React.ComponentProps<typeof MaterialIcons>['name']

const GLYPHS = {
  close: 'close',
  check: 'check',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronDown: 'keyboard-arrow-down',
  chevronUp: 'keyboard-arrow-up',
  signOut: 'logout',
  eye: 'visibility',
  eyeOff: 'visibility-off',
  menu: 'menu',
  search: 'search',
  back: 'arrow-back',
  refresh: 'refresh',
  palette: 'palette',
  person: 'person',
  gavel: 'gavel',
  notes: 'notes',
  case: 'folder-open',
  leave: 'event-busy',
  archive: 'archive',
  today: 'today',
  settings: 'settings',
  share: 'share',
  note: 'sticky-note-2',
  pin: 'push-pin',
  add: 'add',
  trash: 'delete-outline',
  file: 'description',
  undo: 'undo',
  draw: 'draw',
  edit: 'edit',
  keyboard: 'keyboard',
} as const satisfies Record<string, Glyph>

export type IconName = keyof typeof GLYPHS

interface Props {
  name: IconName
  size?: number
  color?: string
}

export default function Icon({ name, size = 20, color = theme.ink }: Props) {
  return <MaterialIcons name={GLYPHS[name]} size={size} color={color} accessible={false} />
}
