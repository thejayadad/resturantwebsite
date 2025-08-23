'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

  // Load item + default variant price (or first)
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id, isAvailable: true },
    select: {
      id: true, title: true,
      variants: { select: { name: true, price: true, isDefault: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!item || item.variants.length === 0) throw new Error('Item not available')

  const variant = item.variants.find(v => v.isDefault) ?? item.variants[0]
  const unitPrice = variant.price.toString()

  const session = await auth()
  const customerEmail = session?.user?.email ?? null

  // Reuse / create a DRAFT order as “cart”, tracked by cookie
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

  // Add line (simple: no merging; you can merge same (item+variant) later)
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      menuItemId: item.id,
      itemTitle: item.title,
      variantName: variant.name,
      unitPrice,
      quantity,
    },
  })

  // Recompute subtotal/total
  const lines = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    select: { unitPrice: true, quantity: true },
  })
  const subtotal = lines
    .reduce((sum, l) => sum + Number(l.unitPrice) * l.quantity, 0)
    .toFixed(2)

  await prisma.order.update({
    where: { id: order.id },
    data: { subtotal, total: subtotal },
  })

  redirect(`/${domain}/cart`)
}
