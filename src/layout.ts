import { useWindowDimensions } from 'react-native'

export const BREAKPOINT = { medium: 600, docked: 900, large: 1280, dialog: 720, short: 480 }

export type SizeClass = 'compact' | 'medium' | 'expanded' | 'large'

export interface Layout {
  width: number
  height: number
  sizeClass: SizeClass
  docked: boolean
  dockWidth: number
  arrows: boolean
  dialog: boolean
  short: boolean
  lowHeight: boolean
}

export function layoutFor(width: number, height: number): Layout {
  const sizeClass: SizeClass = width >= BREAKPOINT.large ? 'large' : width >= BREAKPOINT.docked ? 'expanded' : width >= BREAKPOINT.medium ? 'medium' : 'compact'
  return {
    width,
    height,
    sizeClass,
    docked: width >= BREAKPOINT.docked,
    dockWidth: width >= BREAKPOINT.large ? 320 : 280,
    arrows: width >= BREAKPOINT.medium,
    dialog: width >= BREAKPOINT.dialog && height >= 520,
    short: width < BREAKPOINT.short,
    lowHeight: height < 480,
  }
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions()
  return layoutFor(width, height)
}
