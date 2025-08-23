import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function SuccessPage({
  params, searchParams,
}: {
  params: { domain: string },
  searchParams: { orderId?: string; session_id?: string }
}) {
  const { orderId, session_id } = searchParams
  if (!orderId || !session_id) return notFound()

  const restaurant = await prisma.restaurant.findUnique({
    where: { domain: params.domain },
    select: { id: true, name: true },
  })
  if (!restaurant) return notFound()

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: { id: true, total: true, paymentStatus: true, status: true },
  })
  if (!order) return notFound()

  const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] })
  const isPaid = session.payment_status === 'paid' || session.status === 'complete'

  if (isPaid && order.paymentStatus !== 'PAID') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'PAID',
        stripePaymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      },
    })
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thanks! Your order is confirmed.</h1>
      <p className="text-neutral-600">Payment {isPaid ? 'received' : 'processing'} for <span className="font-medium">{restaurant.name}</span>.</p>
      <p className="text-sm">Order ID: <span className="font-mono">{order.id}</span></p>
      <p className="text-sm">Total: <span className="font-medium">${Number(order.total).toFixed(2)}</span></p>
      <Link href={`/${params.domain}/menu`} className="underline text-sm">← Back to menu</Link>
    </div>
  )
}
