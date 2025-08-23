'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Helper: get or create the current user's restaurant
async function ensureRestaurantId(): Promise<string | null> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null

  // ⬇️ select only id here
  let restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
    select: { id: true },
  })

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        ownerEmail: email,
        name: session?.user?.name ? `${session.user.name}'s Restaurant` : 'My Restaurant',
      },
      // ⬇️ and also only id here
      select: { id: true },
    })
  }
  return restaurant.id
}


export async function createCategory(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const nameRaw = String(formData.get('name') ?? '').trim()
  if (!nameRaw) return

  // compute next sort order
  const max = await prisma.category.aggregate({
    where: { restaurantId },
    _max: { sortOrder: true },
  })
  const nextSort = (max._max.sortOrder ?? -1) + 1

  try {
    await prisma.category.create({
      data: { restaurantId, name: nameRaw, sortOrder: nextSort },
    })
  } catch (e) {
    // likely unique violation on (restaurantId, name) — ignore for now
  }

  revalidatePath('/dashboard/categories')
  redirect('/dashboard/categories')
}

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(80).optional(),
  isActive: z.enum(['on', 'off']).optional(), // checkbox coercion
})

export async function updateCategory(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    name: (formData.get('name') ?? undefined) as any,
    isActive: formData.get('isActive') ? 'on' : 'off',
  })
  if (!parsed.success) return
  const { id, name, isActive } = parsed.data

  // Only update categories belonging to this restaurant
  const cat = await prisma.category.findUnique({ where: { id } })
  if (!cat || cat.restaurantId !== restaurantId) return

  const data: any = { isActive: isActive === 'on' }
  if (typeof name === 'string') data.name = name

  try {
    await prisma.category.update({ where: { id }, data })
  } catch (e) {
    // swallow unique name errors for now
  }

  revalidatePath('/dashboard/categories')
  redirect('/dashboard/categories')
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const id = String(formData.get('id') || '')
  if (!id) return

  const cat = await prisma.category.findUnique({ where: { id } })
  if (!cat || cat.restaurantId !== restaurantId) return

  await prisma.$transaction(async (tx) => {
    // If you later add items in a category, handle cascading deletes here.
    await tx.category.delete({ where: { id } })
    // Compact sort order (optional)
    const cats = await tx.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    })
    for (let i = 0; i < cats.length; i++) {
      await tx.category.update({ where: { id: cats[i].id }, data: { sortOrder: i } })
    }
  })

  revalidatePath('/dashboard/categories')
  redirect('/dashboard/categories')
}

export async function moveCategory(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const id = String(formData.get('id') || '')
  const dir = String(formData.get('dir') || '') as 'up'|'down'
  if (!id || !['up','down'].includes(dir)) return

  const list = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, sortOrder: true },
  })
  const idx = list.findIndex(c => c.id === id)
  if (idx < 0) return

  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= list.length) return

  const a = list[idx], b = list[swapIdx]
  await prisma.$transaction([
    prisma.category.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.category.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ])

  revalidatePath('/dashboard/categories')
  redirect('/dashboard/categories')
}
