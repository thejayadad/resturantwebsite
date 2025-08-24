import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import KitchenBoard from '@/components/dashboard/kitchen-board'

const toNum = (v: unknown) => (v instanceof Prisma.Decimal ? v.toNumber() : Number(v))

export const dynamic = 'force-dynamic'

export default async function KitchenPage() {
  const session = await auth()
  const email = session?.user?.email

  const restaurant = email
    ? await prisma.restaurant.findUnique({
        where: { ownerEmail: email },
        select: { id: true, name: true, domain: true },
      })
    : null

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">Kitchen</h1>
        <p className="text-neutral-600 text-sm">No restaurant found.</p>
        <Link className="underline text-sm" href="/dashboard">← Back to Dashboard</Link>
      </div>
    )
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, status: { in: ['PAID', 'PREPARING', 'READY'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      status: true,
      customerEmail: true,
      createdAt: true,
      subtotal: true,
      total: true,
      items: {
        select: { id: true, itemTitle: true, variantName: true, quantity: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const payload = orders.map(o => ({
    id: o.id,
    status: o.status as 'PAID' | 'PREPARING' | 'READY',
    customerEmail: o.customerEmail,
    createdAt: o.createdAt.toISOString(),
    subtotal: toNum(o.subtotal),
    total: toNum(o.total),
    items: o.items.map(i => ({
      id: i.id,
      itemTitle: i.itemTitle,
      variantName: i.variantName,
      quantity: i.quantity,
    })),
  }))

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kitchen — {restaurant.name}</h1>
          <p className="text-sm text-neutral-500">{restaurant.domain ? `/${restaurant.domain}` : ''}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/orders" className="underline text-sm">Orders</Link>
          <button
            className="text-sm underline"
          >
            Fullscreen
          </button>
        </div>
      </div>

      <KitchenBoard initialOrders={payload} />
    </div>
  )
}
