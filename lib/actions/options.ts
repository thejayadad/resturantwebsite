'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Reuse helper
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

/* -------------------- Groups -------------------- */

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional().or(z.literal('')),
  selectionType: z.enum(['SINGLE', 'MULTI']),
  minSelect: z.coerce.number().int().min(0).default(0),
  maxSelect: z.coerce.number().int().min(0).optional().or(z.literal('')),
})

export async function createGroup(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = createGroupSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    selectionType: formData.get('selectionType'),
    minSelect: formData.get('minSelect') ?? 0,
    maxSelect: formData.get('maxSelect') ?? '',
  })
  if (!p.success) return

  const { name, description, selectionType, minSelect, maxSelect } = p.data

  // normalize SINGLE ⇒ maxSelect <= 1
  const max = selectionType === 'SINGLE'
    ? 1
    : (maxSelect === '' ? null : Number(maxSelect))

  try {
    await prisma.optionGroup.create({
      data: {
        restaurantId,
        name,
        description: description || null,
        selectionType,
        minSelect,
        maxSelect: max,
      },
    })
  } catch {}

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

const updateGroupSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional().or(z.literal('')),
  selectionType: z.enum(['SINGLE', 'MULTI']).optional(),
  minSelect: z.coerce.number().int().min(0).optional(),
  maxSelect: z.coerce.number().int().min(0).optional().or(z.literal('')),
  isActive: z.enum(['on','off']).optional(),
})

export async function updateGroup(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = updateGroupSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name') ?? undefined,
    description: formData.get('description') ?? undefined,
    selectionType: formData.get('selectionType') ?? undefined,
    minSelect: formData.get('minSelect') ?? undefined,
    maxSelect: formData.get('maxSelect') ?? undefined,
    isActive: formData.get('isActive') ? 'on' : 'off',
  })
  if (!p.success) return
  const { id, isActive, ...rest } = p.data

  const g = await prisma.optionGroup.findUnique({ where: { id }, select: { restaurantId: true, selectionType: true } })
  if (!g || g.restaurantId !== restaurantId) return

  const data: any = { isActive: isActive === 'on' ? true : false }
  if (rest.name !== undefined) data.name = rest.name
  if (rest.description !== undefined) data.description = rest.description || null
  if (rest.selectionType !== undefined) data.selectionType = rest.selectionType
  if (rest.minSelect !== undefined) data.minSelect = rest.minSelect
  if (rest.maxSelect !== undefined) {
    data.maxSelect = (rest.maxSelect === '' as any) ? null : Number(rest.maxSelect)
  }

  // if selection becomes SINGLE, clamp maxSelect to 1
  if ((rest.selectionType ?? g.selectionType) === 'SINGLE') {
    data.maxSelect = 1
    if (data.minSelect && data.minSelect > 1) data.minSelect = 1
  }

  try {
    await prisma.optionGroup.update({ where: { id }, data })
  } catch {}

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

export async function deleteGroup(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const id = String(formData.get('id') || '')
  if (!id) return

  const g = await prisma.optionGroup.findUnique({ where: { id }, select: { restaurantId: true } })
  if (!g || g.restaurantId !== restaurantId) return

  await prisma.$transaction(async (tx) => {
    await tx.menuItemOptionGroup.deleteMany({ where: { groupId: id } })
    await tx.optionGroup.delete({ where: { id } }) // Options cascade via onDelete: Cascade
  })

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

/* -------------------- Options -------------------- */

const createOptionSchema = z.object({
  groupId: z.string().cuid(),
  name: z.string().min(1).max(80),
  priceDelta: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal('')),
})

export async function createOption(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = createOptionSchema.safeParse({
    groupId: formData.get('groupId'),
    name: formData.get('name'),
    priceDelta: formData.get('priceDelta') ?? '',
  })
  if (!p.success) return
  const { groupId, name, priceDelta } = p.data

  const g = await prisma.optionGroup.findUnique({ where: { id: groupId }, select: { restaurantId: true } })
  if (!g || g.restaurantId !== restaurantId) return

  // next sort
  const max = await prisma.option.aggregate({
    where: { groupId },
    _max: { sortOrder: true },
  })
  const nextSort = (max._max.sortOrder ?? -1) + 1

  try {
    await prisma.option.create({
      data: {
        groupId,
        name,
        priceDelta: priceDelta ? priceDelta : '0',
        sortOrder: nextSort,
      },
    })
  } catch {}

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

const updateOptionSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(80).optional(),
  priceDelta: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal('')),
  isAvailable: z.enum(['on','off']).optional(),
})

export async function updateOption(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = updateOptionSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name') ?? undefined,
    priceDelta: formData.get('priceDelta') ?? undefined,
    isAvailable: formData.get('isAvailable') ? 'on' : 'off',
  })
  if (!p.success) return
  const { id, isAvailable, ...rest } = p.data

  const opt = await prisma.option.findUnique({
    where: { id },
    select: { groupId: true, group: { select: { restaurantId: true } } },
  })
  if (!opt || opt.group.restaurantId !== restaurantId) return

  const data: any = { isAvailable: isAvailable === 'on' }
  if (rest.name !== undefined) data.name = rest.name
  if (rest.priceDelta !== undefined) data.priceDelta = rest.priceDelta ? rest.priceDelta : '0'

  try {
    await prisma.option.update({ where: { id }, data })
  } catch {}

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

export async function deleteOption(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const id = String(formData.get('id') || '')
  if (!id) return

  const opt = await prisma.option.findUnique({
    where: { id },
    select: { groupId: true, group: { select: { restaurantId: true } } },
  })
  if (!opt || opt.group.restaurantId !== restaurantId) return

  await prisma.option.delete({ where: { id } })

  revalidatePath('/dashboard/options')
  redirect('/dashboard/options')
}

/* -------------------- Attach to Items -------------------- */

const attachSchema = z.object({
  itemId: z.string().cuid(),
  groupId: z.string().cuid(),
  required: z.enum(['on','off']).optional(),
  minSelect: z.coerce.number().int().min(0).optional(),
  maxSelect: z.coerce.number().int().min(0).optional().or(z.literal('')),
})

export async function attachGroupToItem(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = attachSchema.safeParse({
    itemId: formData.get('itemId'),
    groupId: formData.get('groupId'),
    required: formData.get('required') ? 'on' : 'off',
    minSelect: formData.get('minSelect') ?? undefined,
    maxSelect: formData.get('maxSelect') ?? undefined,
  })
  if (!p.success) return
  const { itemId, groupId, required, minSelect, maxSelect } = p.data

  const [item, group] = await Promise.all([
    prisma.menuItem.findUnique({ where: { id: itemId }, select: { restaurantId: true } }),
    prisma.optionGroup.findUnique({ where: { id: groupId }, select: { restaurantId: true, selectionType: true, minSelect: true, maxSelect: true } }),
  ])
  if (!item || !group || item.restaurantId !== restaurantId || group.restaurantId !== restaurantId) return

  const effectiveMin = minSelect ?? group.minSelect
  const effectiveMax =
    group.selectionType === 'SINGLE'
      ? 1
      : (maxSelect === undefined || (maxSelect as any) === '' ? group.maxSelect : Number(maxSelect))

  try {
    await prisma.menuItemOptionGroup.create({
      data: {
        itemId,
        groupId,
        required: required === 'on',
        minSelect: effectiveMin,
        maxSelect: effectiveMax,
      },
    })
  } catch {}

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

const updateAttachSchema = z.object({
  id: z.string().cuid(),
  required: z.enum(['on','off']).optional(),
  minSelect: z.coerce.number().int().min(0).optional(),
  maxSelect: z.coerce.number().int().min(0).optional().or(z.literal('')),
})

export async function updateAttachment(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return

  const p = updateAttachSchema.safeParse({
    id: formData.get('id'),
    required: formData.get('required') ? 'on' : 'off',
    minSelect: formData.get('minSelect') ?? undefined,
    maxSelect: formData.get('maxSelect') ?? undefined,
  })
  if (!p.success) return
  const { id, required, minSelect, maxSelect } = p.data

  // confirm tenant
  const att = await prisma.menuItemOptionGroup.findUnique({
    where: { id },
    select: {
      item: { select: { restaurantId: true } },
      group: { select: { selectionType: true } },
    },
  })
  if (!att || att.item.restaurantId !== restaurantId) return

  const data: any = {
    required: required === 'on',
  }
  if (minSelect !== undefined) data.minSelect = minSelect
  if (maxSelect !== undefined) {
    data.maxSelect = (maxSelect === '' as any) ? null : Number(maxSelect)
  }
  if (att.group.selectionType === 'SINGLE') {
    data.minSelect = Math.min(data.minSelect ?? 0, 1)
    data.maxSelect = 1
  }

  await prisma.menuItemOptionGroup.update({ where: { id }, data })

  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}

export async function detachGroupFromItem(formData: FormData): Promise<void> {
  const restaurantId = await ensureRestaurantId()
  if (!restaurantId) return
  const id = String(formData.get('id') || '')
  if (!id) return

  const att = await prisma.menuItemOptionGroup.findUnique({
    where: { id },
    select: { item: { select: { restaurantId: true } } },
  })
  if (!att || att.item.restaurantId !== restaurantId) return

  await prisma.menuItemOptionGroup.delete({ where: { id } })
  revalidatePath('/dashboard/menu')
  redirect('/dashboard/menu')
}
