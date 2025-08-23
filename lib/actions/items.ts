'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Reuse the pattern you used for categories:
async function ensureRestaurantId(): Promise<string | null> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null

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
      select: { id: true },
    })
  }
  return restaurant.id
}

const createItemSchema = z.object({
  title: z.string().min(1).max(120),
  code: z.string().max(20).optional().or(z.literal('')),
  categoryId: z.string().cuid().optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
})

export async function createItem(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const parsed = createItemSchema.safeParse({
    title: formData.get('title'),
    code: formData.get('code') ?? '',
    categoryId: formData.get('categoryId') ?? '',
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) return
  const { title, code, categoryId, description } = parsed.data

  try {
    await prisma.menuItem.create({
      data: {
        restaurantId,
        title,
        code: code ? code : null,
        categoryId: categoryId ? categoryId : null,
        description: description || null,
      },
    })
  } catch {
    // swallow (unique code) for now
  }

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

const updateItemSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(120).optional(),
  code: z.string().max(20).optional().or(z.literal('')),
  categoryId: z.string().cuid().optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  isAvailable: z.enum(['on','off']).optional(),
})

export async function updateItem(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const parsed = updateItemSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title') ?? undefined,
    code: formData.get('code') ?? undefined,
    categoryId: formData.get('categoryId') ?? undefined,
    description: formData.get('description') ?? undefined,
    isAvailable: formData.get('isAvailable') ? 'on' : 'off',
  })
  if (!parsed.success) return
  const { id, isAvailable, ...rest } = parsed.data

  const item = await prisma.menuItem.findUnique({ where: { id }, select: { restaurantId: true } })
  if (!item || item.restaurantId !== restaurantId) return

  const data: any = { isAvailable: isAvailable === 'on' }
  if (rest.title !== undefined) data.title = rest.title
  if (rest.code !== undefined) data.code = rest.code ? rest.code : null
  if (rest.categoryId !== undefined) data.categoryId = rest.categoryId ? rest.categoryId : null
  if (rest.description !== undefined) data.description = rest.description || null

  try {
    await prisma.menuItem.update({ where: { id }, data })
  } catch {
    // unique code conflicts
  }

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

export async function deleteItem(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const id = String(formData.get('id') || '')
  if (!id) return

  const item = await prisma.menuItem.findUnique({ where: { id }, select: { restaurantId: true } })
  if (!item || item.restaurantId !== restaurantId) return

  await prisma.menuItem.delete({ where: { id } })
  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

const addVariantSchema = z.object({
  itemId: z.string().cuid(),
  name: z.string().min(1).max(40),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/), // keep as string; Prisma Decimal accepts string
  makeDefault: z.enum(['on','off']).optional(),
})

export async function addVariant(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const parsed = addVariantSchema.safeParse({
    itemId: formData.get('itemId'),
    name: formData.get('name'),
    price: formData.get('price'),
    makeDefault: formData.get('makeDefault') ? 'on' : 'off',
  })
  if (!parsed.success) return
  const { itemId, name, price, makeDefault } = parsed.data

  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { restaurantId: true } })
  if (!item || item.restaurantId !== restaurantId) return

  await prisma.$transaction(async (tx) => {
    const v = await tx.menuItemVariant.create({
      data: { itemId, name, price, isDefault: false },
    })
    if (makeDefault === 'on') {
      await tx.menuItemVariant.updateMany({ where: { itemId }, data: { isDefault: false } })
      await tx.menuItemVariant.update({ where: { id: v.id }, data: { isDefault: true } })
    }
  })

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

export async function setDefaultVariant(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const itemId = String(formData.get('itemId') || '')
  const variantId = String(formData.get('variantId') || '')
  if (!itemId || !variantId) return

  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { restaurantId: true } })
  if (!item || item.restaurantId !== restaurantId) return

  await prisma.$transaction([
    prisma.menuItemVariant.updateMany({ where: { itemId }, data: { isDefault: false } }),
    prisma.menuItemVariant.update({ where: { id: variantId }, data: { isDefault: true } }),
  ])

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

export async function deleteVariant(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const id = String(formData.get('id') || '')
  if (!id) return

  // confirm tenant
  const v = await prisma.menuItemVariant.findUnique({
    where: { id },
    select: { itemId: true, item: { select: { restaurantId: true } } },
  })
  if (!v || v.item.restaurantId !== restaurantId) return

  await prisma.menuItemVariant.delete({ where: { id } })
  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}
