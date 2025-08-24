import type { ThemeConfig } from "./config" 

const GRID_SM = { 1:'grid-cols-1', 2:'grid-cols-2' } as const
const GRID_MD = { 1:'md:grid-cols-1', 2:'md:grid-cols-2', 3:'md:grid-cols-3' } as const
const GRID_LG = { 1:'lg:grid-cols-1', 2:'lg:grid-cols-2', 3:'lg:grid-cols-3', 4:'lg:grid-cols-4' } as const
const GAP     = { 3:'gap-3', 4:'gap-4', 6:'gap-6' } as const
const TEXT    = { left:'text-left', center:'text-center' } as const
const CARD    = {
  soft:   'rounded-2xl border shadow-sm bg-white',
  solid:  'rounded-2xl shadow-md bg-white',
  outline:'rounded-2xl border-2 bg-white',
} as const

export function themeToClasses(t: ThemeConfig) {
  return {
    grid: `grid ${GRID_SM[t.grid.sm]} ${GRID_MD[t.grid.md]} ${GRID_LG[t.grid.lg]} ${GAP[t.gap]}`,
    text: TEXT[t.textAlign],
    card: CARD[t.cardStyle],
  }
}
