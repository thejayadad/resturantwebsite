// lib/theme/config.ts
export type ThemeConfig = {
  grid: { sm: 1 | 2; md: 1 | 2 | 3; lg: 1 | 2 | 3 | 4 }
  gap: 3 | 4 | 6
  textAlign: 'left' | 'center'
  cardStyle: 'soft' | 'solid' | 'outline'
  showImages: boolean
  accentHex: string
}

export const DEFAULT_THEME: ThemeConfig = {
  grid: { sm: 1, md: 2, lg: 3 },
  gap: 4,
  textAlign: 'left',
  cardStyle: 'soft',
  showImages: true,
  accentHex: '#0284c7',
}

export const PRESETS: Record<string, ThemeConfig> = {
  classic: DEFAULT_THEME,
  cozy:    { grid:{sm:1,md:2,lg:2}, gap:6, textAlign:'left',  cardStyle:'soft',   showImages:true,  accentHex:'#0ea5e9' },
  gallery: { grid:{sm:2,md:3,lg:4}, gap:4, textAlign:'center',cardStyle:'solid',  showImages:false, accentHex:'#14b8a6' },
}

const toNum = (v: any) => (typeof v === 'string' ? Number(v) : v)
const oneOf = <T extends readonly any[]>(v: any, list: T, def: T[number]) =>
  (list as readonly any[]).includes(v) ? (v as T[number]) : def

export function mergeTheme(raw: any): ThemeConfig {
  const t = (raw ?? {}) as Partial<ThemeConfig>

  const sm = oneOf(toNum(t.grid?.sm), [1,2] as const, DEFAULT_THEME.grid.sm)
  const md = oneOf(toNum(t.grid?.md), [1,2,3] as const, DEFAULT_THEME.grid.md)
  const lg = oneOf(toNum(t.grid?.lg), [1,2,3,4] as const, DEFAULT_THEME.grid.lg)

  const gap = oneOf(toNum(t.gap), [3,4,6] as const, DEFAULT_THEME.gap)
  const textAlign = oneOf(t.textAlign, ['left','center'] as const, DEFAULT_THEME.textAlign)
  const cardStyle = oneOf(t.cardStyle, ['soft','solid','outline'] as const, DEFAULT_THEME.cardStyle)

  const showImages = Boolean(t.showImages ?? DEFAULT_THEME.showImages)
  const accentHex = typeof t.accentHex === 'string' ? t.accentHex : DEFAULT_THEME.accentHex

  return { grid: { sm, md, lg }, gap, textAlign, cardStyle, showImages, accentHex }
}
