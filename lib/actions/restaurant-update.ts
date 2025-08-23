'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const schema = z.object({
  id: z.string(),
  name: z.string().min(2).max(80).optional(),
  domain: z.string().min(3).max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),

  addressLine1: z.string().max(120).optional().or(z.literal('')),
  addressLine2: z.string().max(120).optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
  state: z.string().max(80).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  tz: z.string().max(80).optional().or(z.literal('')),
  isActive: z.enum(['on', 'off']).optional(), // checkbox -> "on"/undefined
})

export async function updateRestaurant(formData: FormData): Promise<void> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return

  const parsed = schema.safeParse({
    id: formData.get('id'),
    name: formData.get('name') ?? undefined,
    domain: formData.get('domain') ?? undefined,
    description: formData.get('description') ?? undefined,
    phone: formData.get('phone') ?? undefined,
    addressLine1: formData.get('addressLine1') ?? undefined,
    addressLine2: formData.get('addressLine2') ?? undefined,
    city: formData.get('city') ?? undefined,
    state: formData.get('state') ?? undefined,
    postalCode: formData.get('postalCode') ?? undefined,
    tz: formData.get('tz') ?? undefined,
    isActive: formData.get('isActive') ? 'on' : 'off',
  })
  if (!parsed.success) return

  const { id, isActive, ...rest } = parsed.data

  // Ownership guard
  const r = await prisma.restaurant.findUnique({ where: { id }, select: { ownerEmail: true } })
  if (!r || r.ownerEmail !== email) return

  // Build patch
  const data: Record<string, any> = { isActive: isActive === 'on' }
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) {
      // clear some fields to NULL when blank
      if (['domain', 'phone', 'addressLine2', 'description'].includes(k)) {
        data[k] = (v as string) || null
      } else {
        data[k] = v
      }
    }
  }

  try {
    await prisma.restaurant.update({ where: { id }, data })
  } catch (err: any) {
    // Unique constraint handling (name / domain)
    if (err?.code === 'P2002') {
      // You can surface a toast with cookies or searchParams; for now we just bail.
      return
    }
    throw err
  }

  revalidatePath('/dashbaord/restaurant')
  redirect('/dashboard')
}
