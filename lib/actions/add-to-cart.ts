// lib/actions/add-to-cart.ts
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// helper
const toNum = (v: unknown) => (typeof v === 'string' ? Number(v) : Number(v))

export async function addToCart(formData: FormData) {
  const domain = String(formData.get('domain') || '').trim()
  const itemId = String(formData.get('itemId') || '').trim()
  const quantity = Math.max(1, Number(formData.get('quantity') || 1))
  if (!domain || !itemId) throw new Error('Missing domain or itemId')

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain },
    select: { id: true },
  })
  if (!restaurant) throw new Error('Restaurant not found')

  // Load item + default variant
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id, isAvailable: true },
    select: {
      id: true,
      title: true,
      variants: { select: { name: true, price: true, isDefault: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!item || item.variants.length === 0) throw new Error('Item unavailable')

  const variant = item.variants.find(v => v.isDefault) ?? item.variants[0]
  const unitPrice = variant.price.toString()

  // Gather selected option IDs from formData
  // We accept keys: opt_<groupId> (radio) and opt_<groupId>[] (checkbox group)
  const selectedOptionIds = new Set<string>()
  for (const key of Array.from(formData.keys())) {
    if (!key.startsWith('opt_')) continue
    const values = formData.getAll(key).map(v => String(v))
    for (const v of values) if (v) selectedOptionIds.add(v)
  }
  const optionIds = Array.from(selectedOptionIds)

  // Fetch options to compute optionTotal and snapshot names
  const optionRows = optionIds.length
    ? await prisma.option.findMany({
        where: { id: { in: optionIds } },
        select: { id: true, name: true, priceDelta: true, group: { select: { name: true } } },
      })
    : []

  const optionTotal = optionRows
    .reduce((sum, o) => sum + Number(o.priceDelta), 0)
    .toFixed(2)

  // Reuse/create draft order tracked in a cookie
  const session = await auth()
  const customerEmail = session?.user?.email ?? null
  const c = cookies()
  const cartId = (await c).get('cartId')?.value

  let order = cartId
    ? await prisma.order.findFirst({
        where: { id: cartId, restaurantId: restaurant.id, status: 'DRAFT' },
        select: { id: true },
      })
    : null

  if (!order) {
    order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        customerEmail,
        status: 'DRAFT',
        subtotal: '0',
        total: '0',
      },
      select: { id: true },
    })
    ;(await c).set('cartId', order.id, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
  }

  // Create line with option snapshots
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      menuItemId: item.id,
      itemTitle: item.title,
      variantName: variant.name,
      unitPrice,
      optionTotal,
      quantity,
      options: {
        create: optionRows.map(o => ({
          groupName: o.group.name,
          optionName: o.name,
          priceDelta: o.priceDelta.toString(),
        })),
      },
    },
  })

  // Recompute totals: (unitPrice + optionTotal) * qty
  const lines = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    select: { unitPrice: true, optionTotal: true, quantity: true },
  })
  const subtotal = lines
    .reduce(
      (sum, l) => sum + (Number(l.unitPrice) + Number(l.optionTotal)) * l.quantity,
      0
    )
    .toFixed(2)

  await prisma.order.update({
    where: { id: order.id },
    data: { subtotal, total: subtotal },
  })

  redirect(`/${domain}/cart`)
}
