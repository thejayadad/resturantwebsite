// lib/actions/orders/update-status.ts
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ALLOWED: Record<string, string[]> = {
  PAID: ['PREPARING', 'READY', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get('orderId') || '')
  const next = String(formData.get('status') || '') as keyof typeof ALLOWED
  const back = String(formData.get('back') || '/dashboard/orders')

  if (!orderId || !next) return redirect(back)

  const session = await auth()
  const ownerEmail = session?.user?.email
  if (!ownerEmail) return redirect('/')

  // Find owner’s restaurant
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail },
    select: { id: true },
  })
  if (!restaurant) return redirect(back)

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: { id: true, status: true },
  })
  if (!order) return redirect(back)

  // Block changing DRAFT; allow transitions from whitelist above
  if (order.status === 'DRAFT') return redirect(back)
  const allowed = ALLOWED[order.status] ?? []
  if (!allowed.includes(next)) return redirect(back)

  await prisma.order.update({
    where: { id: order.id },
    data: { status: next as any },
  })

  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${order.id}`)
}
