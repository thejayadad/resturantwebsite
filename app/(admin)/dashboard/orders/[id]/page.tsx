// app/dashboard/orders/[id]/page.tsx
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { updateOrderStatus } from '@/lib/actions/update-order-status'

const toNum = (v: unknown) => v instanceof Prisma.Decimal ? v.toNumber() : Number(v)
const usd = (v: unknown) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(toNum(v))

const STATUS_COLORS: Record<string,string> = {
  PAID: 'bg-blue-50 text-blue-700 border-blue-200',
  PREPARING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  READY: 'bg-green-50 text-green-700 border-green-200',
  COMPLETED: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  CANCELED: 'bg-red-50 text-red-700 border-red-200',
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return notFound()

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
    select: { id: true, name: true, domain: true },
  })
  if (!restaurant) return notFound()

  const order = await prisma.order.findFirst({
    where: { id: params.id, restaurantId: restaurant.id },
    select: {
      id: true,
      status: true,
      customerEmail: true,
      subtotal: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          itemTitle: true,
          variantName: true,
          quantity: true,
          unitPrice: true,
          optionTotal: true,
          options: { select: { optionName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!order) return notFound()

  const statusClass = STATUS_COLORS[order.status] ?? 'bg-neutral-50 text-neutral-700 border-neutral-200'

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order</h1>
          <div className="text-xs text-neutral-500 font-mono mt-1">{order.id}</div>
        </div>
        <Link href="/dashboard/orders" className="text-sm underline">Back to Orders</Link>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusClass}`}>
            {order.status}
          </span>
          <div className="text-sm text-neutral-600">
            Placed: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(order.createdAt)}
          </div>
          <div className="text-sm text-neutral-600">
            Customer: {order.customerEmail ?? <span className="text-neutral-400">Guest</span>}
          </div>
        </div>

        <div className="space-y-2">
          {order.items.map(li => {
            const lineTotal = (toNum(li.unitPrice) + toNum(li.optionTotal ?? 0)) * li.quantity
            return (
              <div key={li.id} className="flex items-start justify-between rounded-xl border p-3">
                <div>
                  <div className="font-medium">
                    {li.itemTitle}{li.variantName ? ` — ${li.variantName}` : ''}
                  </div>
                  {!!li.options?.length && (
                    <div className="text-xs text-neutral-500">
                      {li.options.map(o => o.optionName).join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-neutral-600">Qty {li.quantity}</div>
                </div>
                <div className="text-sm font-semibold">{usd(lineTotal)}</div>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-3 flex items-center justify-between">
          <div className="text-sm text-neutral-600">Subtotal</div>
          <div className="text-base font-semibold">{usd(order.subtotal)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">Total</div>
          <div className="text-base font-semibold">{usd(order.total)}</div>
        </div>
      </div>

      {/* Update status */}
      {order.status !== 'DRAFT' && order.status !== 'COMPLETED' && order.status !== 'CANCELED' ? (
        <form action={updateOrderStatus} className="rounded-2xl border p-4 flex items-end gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="back" value={`/dashboard/orders/${order.id}`} />
          <label className="block">
            <span className="text-xs text-neutral-500">Update Status</span>
            <select name="status" defaultValue={order.status} className="mt-1 rounded border px-2 py-1 text-sm">
              {order.status === 'PAID' && (
                <>
                  <option value="PAID">PAID</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY">READY</option>
                  <option value="CANCELED">CANCELED</option>
                </>
              )}
              {order.status === 'PREPARING' && (
                <>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY">READY</option>
                  <option value="CANCELED">CANCELED</option>
                </>
              )}
              {order.status === 'READY' && (
                <>
                  <option value="READY">READY</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELED">CANCELED</option>
                </>
              )}
            </select>
          </label>
          <button className="rounded border px-3 py-1 text-sm" type="submit">Save</button>
        </form>
      ) : null}
    </div>
  )
}
