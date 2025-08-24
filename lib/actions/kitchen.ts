// lib/actions/kitchen.ts
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const ALLOWED: Record<string, string[]> = {
  PAID: ['PREPARING', 'READY', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
}

export async function updateKitchenOrderStatus(formData: FormData): Promise<void> {
  const orderId = String(formData.get('orderId') || '')
  const status = String(formData.get('status') || '')

  if (!orderId || !status) return

  const session = await auth()
  const ownerEmail = session?.user?.email
  if (!ownerEmail) return

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail },
    select: { id: true },
  })
  if (!restaurant) return

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: { id: true, status: true },
  })
  if (!order) return

  if (order.status === 'DRAFT') return
  const allowed = ALLOWED[order.status] ?? []
  if (!allowed.includes(status)) return

  await prisma.order.update({ where: { id: order.id }, data: { status: status as any } })

  // Revalidate views
  revalidatePath('/dashboard/kitchen')
  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${order.id}`)
}
