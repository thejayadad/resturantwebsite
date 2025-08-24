// lib/actions/cart/checkout.ts
'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'   // ✅ add this
import { stripe } from './stripe'

const toCents = (n: string | number) => Math.round(Number(n) * 100)

export async function startCheckout(formData: FormData) {
  const domain = String(formData.get('domain') || '').trim()
  if (!domain) throw new Error('Missing domain')

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain },
    select: { id: true, name: true },
  })
  if (!restaurant) throw new Error('Restaurant not found')

  const cartId = (await cookies()).get('cartId')?.value
  if (!cartId) redirect(`/${domain}/cart?empty=1`)

  const order = await prisma.order.findFirst({
    where: { id: cartId, restaurantId: restaurant.id, status: 'DRAFT' },
    select: {
      id: true, total: true,
      items: { select: { itemTitle: true, variantName: true, unitPrice: true, quantity: true } },
    },
  })
  if (!order || order.items.length === 0) redirect(`/${domain}/cart?empty=1`)

  const sessionAuth = await auth()
  const prefillEmail = sessionAuth?.user?.email ?? undefined  // ✅

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '')
  const successUrl = `${baseUrl}/${domain}/order/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl  = `${baseUrl}/${domain}/cart?canceled=1`

  const line_items = order.items.map(li => ({
    quantity: li.quantity,
    price_data: {
      currency: 'usd',
      product_data: { name: `${li.itemTitle}${li.variantName ? ` — ${li.variantName}` : ''}` },
      unit_amount: toCents(li.unitPrice.toString()),
    },
  }))

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: prefillEmail,        // ✅ prefills & is also returned in customer_details
    customer_creation: 'if_required',    // optional; creates a Customer record
    metadata: { orderId: order.id, restaurantId: restaurant.id },
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  })

  redirect(session.url!)
}
