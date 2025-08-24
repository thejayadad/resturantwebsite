'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { DEFAULT_THEME, PRESETS, type ThemeConfig } from '@/lib/theme/config'

function parseBool(v: FormDataEntryValue | null, def = false) {
  if (v === null) return def
  const s = String(v).toLowerCase()
  return s === 'on' || s === 'true' || s === '1'
}

export async function saveTheme(formData: FormData): Promise<void> {
  const session = await auth()
  const ownerEmail = session?.user?.email
  if (!ownerEmail) return

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail },
    select: { id: true, domain: true },
  })
  if (!restaurant) return

  const preset = (formData.get('preset') || '').toString()
  const t: ThemeConfig = PRESETS[preset] ?? {
    grid: {
      sm: Number(formData.get('gridSm') ?? 1) as 1|2,
      md: Number(formData.get('gridMd') ?? 2) as 1|2|3,
      lg: Number(formData.get('gridLg') ?? 3) as 1|2|3|4,
    },
    gap: Number(formData.get('gap') ?? 4) as 3|4|6,
    textAlign: (formData.get('textAlign') ?? 'left') as 'left'|'center',
    cardStyle: (formData.get('cardStyle') ?? 'soft') as 'soft'|'solid'|'outline',
    showImages: parseBool(formData.get('showImages'), false),
    accentHex: String(formData.get('accentHex') ?? DEFAULT_THEME.accentHex),
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { appearance: t as Prisma.InputJsonValue },
  })

  if (restaurant.domain) revalidatePath(`/${restaurant.domain}/menu`)
  revalidatePath('/dashboard/appearance')
}

export async function resetTheme(): Promise<void> {
  const session = await auth()
  const ownerEmail = session?.user?.email
  if (!ownerEmail) return

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail },
    select: { id: true, domain: true },
  })
  if (!restaurant) return

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { appearance: Prisma.DbNull }, // clear to SQL NULL
  })

  if (restaurant.domain) revalidatePath(`/${restaurant.domain}/menu`)
  revalidatePath('/dashboard/appearance')
}
