// app/(website)/[domain]/order/success/page.tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { stripe } from '@/lib/actions/stripe'

const toNum = (v: unknown) =>
  v instanceof Prisma.Decimal ? v.toNumber() : Number(v)

export default async function SuccessPage(props: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ orderId?: string; session_id?: string }>
}) {
  const { domain } = await props.params
  const { orderId, session_id } = await props.searchParams
  if (!orderId || !session_id) return notFound()

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain },
    select: { id: true, name: true },
  })
  if (!restaurant) return notFound()

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: { id: true, total: true, status: true, stripePaymentIntentId: true, customerEmail: true },
  })
  if (!order) return notFound()

  const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] })
  const isPaid = session.payment_status === 'paid' || session.status === 'complete'

  // ✅ Save the email from Stripe if we don't have it
  const emailFromStripe = session.customer_details?.email ?? null
  if (emailFromStripe && emailFromStripe !== order.customerEmail) {
    await prisma.order.update({
      where: { id: order.id },
      data: { customerEmail: emailFromStripe },
    })
  }

  // Mark paid (minimal model uses status only)
  if (isPaid && order.status !== 'PAID') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? order.stripePaymentIntentId,
      },
    })
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thanks! Your order is confirmed.</h1>
      <p className="text-neutral-600">
        Payment {isPaid ? 'received' : 'processing'} for{' '}
        <span className="font-medium">{restaurant.name}</span>.
      </p>
      <p className="text-sm">Order ID: <span className="font-mono">{order.id}</span></p>
      <p className="text-sm">Total: <span className="font-medium">${toNum(order.total).toFixed(2)}</span></p>
      <Link href={`/${domain}/menu`} className="underline text-sm">← Back to menu</Link>
    </div>
  )
}
