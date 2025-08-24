// lib/actions/cart/update.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function recalcOrderTotals(orderId: string) {
  const lines = await prisma.orderItem.findMany({
    where: { orderId },
    select: { unitPrice: true, optionTotal: true, quantity: true },
  })
  const subtotal = lines
    .reduce(
      (sum, l) =>
        sum + (Number(l.unitPrice) + Number(l.optionTotal ?? 0)) * l.quantity,
      0
    )
    .toFixed(2)

  await prisma.order.update({
    where: { id: orderId },
    data: { subtotal, total: subtotal },
  })
}

export async function updateCartItemQuantity(formData: FormData) {
  const domain = String(formData.get('domain') || '').trim()
  const lineId = String(formData.get('itemId') || '').trim()
  const qty = Math.max(0, Number(formData.get('quantity') || 0))

  if (!domain || !lineId) return redirect(`/${domain}/cart`)

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain },
    select: { id: true },
  })
  if (!restaurant) return redirect(`/${domain}/cart`)

  const cartId = (await cookies()).get('cartId')?.value
  if (!cartId) return redirect(`/${domain}/cart`)

  const line = await prisma.orderItem.findUnique({
    where: { id: lineId },
    select: { id: true, orderId: true },
  })
  if (!line) return redirect(`/${domain}/cart`)

  const order = await prisma.order.findUnique({
    where: { id: line.orderId },
    select: { id: true, restaurantId: true, status: true },
  })
  if (!order || order.id !== cartId || order.restaurantId !== restaurant.id || order.status !== 'DRAFT') {
    return redirect(`/${domain}/cart`)
  }

  if (qty <= 0) {
    // remove line if qty -> 0
    await prisma.orderItemOption.deleteMany({ where: { orderItemId: line.id } })
    await prisma.orderItem.delete({ where: { id: line.id } })
  } else {
    await prisma.orderItem.update({ where: { id: line.id }, data: { quantity: qty } })
  }

  await recalcOrderTotals(order.id)
  revalidatePath(`/${domain}/cart`)
}

export async function removeCartItem(formData: FormData) {
  const domain = String(formData.get('domain') || '').trim()
  const lineId = String(formData.get('itemId') || '').trim()

  if (!domain || !lineId) return redirect(`/${domain}/cart`)

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain },
    select: { id: true },
  })
  if (!restaurant) return redirect(`/${domain}/cart`)

  const cartId = (await cookies()).get('cartId')?.value
  if (!cartId) return redirect(`/${domain}/cart`)

  const line = await prisma.orderItem.findUnique({
    where: { id: lineId },
    select: { id: true, orderId: true },
  })
  if (!line) return redirect(`/${domain}/cart`)

  const order = await prisma.order.findUnique({
    where: { id: line.orderId },
    select: { id: true, restaurantId: true, status: true },
  })
  if (!order || order.id !== cartId || order.restaurantId !== restaurant.id || order.status !== 'DRAFT') {
    return redirect(`/${domain}/cart`)
  }

  await prisma.orderItemOption.deleteMany({ where: { orderItemId: line.id } })
  await prisma.orderItem.delete({ where: { id: line.id } })

  await recalcOrderTotals(order.id)
  revalidatePath(`/${domain}/cart`)
}
