// app/dashboard/orders/page.tsx
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import { Prisma } from '@prisma/client'

const toNum = (v: unknown) =>
  v instanceof Prisma.Decimal ? v.toNumber() : Number(v)

const usd = (v: unknown) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(toNum(v))

function fmt(dt: Date) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt)
  } catch {
    return String(dt)
  }
}

export default async function DashboardOrdersPage() {
  const session = await auth()
  const email = session?.user?.email

  if (!email) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-neutral-600 text-sm">
          You must be signed in to view orders.
        </p>
      </div>
    )
  }

  // Find the restaurant owned by this user
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
    select: { id: true, name: true, domain: true },
  })

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-neutral-600 text-sm">
          No restaurant found for <span className="font-medium">{email}</span>.
        </p>
        <Link className="underline text-sm" href="/dashboard">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  // Load recent orders for this restaurant
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      subtotal: true,
      total: true,
      customerEmail: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          itemTitle: true,
          variantName: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-neutral-500">
            {restaurant.name} {restaurant.domain ? `• /${restaurant.domain}` : ''}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard Home
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full table-auto">
          <thead className="text-left text-sm text-neutral-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const itemSummary =
                o.items.length === 0
                  ? '—'
                  : o.items
                      .map((li) => {
                        const title = li.variantName
                          ? `${li.itemTitle} — ${li.variantName}`
                          : li.itemTitle
                        return `${li.quantity}× ${title}`
                      })
                      .join(', ')
              return (
                <tr key={o.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{o.id}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{fmt(o.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {o.customerEmail ?? <span className="text-neutral-500">Guest</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{itemSummary}</td>
                  <td className="px-4 py-3 text-sm">{usd(o.subtotal)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{usd(o.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                        o.status === 'PAID'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : o.status === 'DRAFT'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200',
                      ].join(' ')}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              )
            })}
            {orders.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-neutral-500" colSpan={7}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {restaurant.domain ? (
        <div className="text-sm">
          <Link className="underline" href={`/${restaurant.domain}/menu`}>
            Open public menu
          </Link>
        </div>
      ) : null}
    </div>
  )
}
