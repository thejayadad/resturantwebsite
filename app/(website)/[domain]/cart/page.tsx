import { startCheckout } from '@/lib/actions/checkout'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { removeCartItem, updateCartItemQuantity } from '@/lib/actions/update-cart'

const toNum = (v: unknown) => v instanceof Prisma.Decimal ? v.toNumber() : Number(v)
const usd = (n: unknown) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(toNum(n))

export default async function CartPage({ params }: { params: { domain: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { domain: params.domain },
    select: { id: true, name: true },
  })
  if (!restaurant) return <div className="p-6">Restaurant not found.</div>

  const cartId = (await cookies()).get('cartId')?.value || null
  const order = cartId
    ? await prisma.order.findFirst({
        where: { id: cartId, restaurantId: restaurant.id, status: 'DRAFT' },
        select: {
          id: true,
          subtotal: true,
          total: true,
          items: {
            select: {
              id: true,
              itemTitle: true,
              variantName: true,
              unitPrice: true,
              optionTotal: true,
              quantity: true,
              options: { select: { optionName: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    : null

  if (!order || order.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">{restaurant.name} — Cart</h1>
        <p className="text-neutral-600">Your cart is empty.</p>
        <Link href={`/${params.domain}/menu`} className="underline text-sm">← Back to menu</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{restaurant.name} — Cart</h1>
        <Link href={`/${params.domain}/menu`} className="underline text-sm">Continue shopping</Link>
      </div>

      <div className="space-y-3">
        {order.items.map(li => {
          const lineTotal = (toNum(li.unitPrice) + toNum(li.optionTotal ?? 0)) * li.quantity
          return (
            <div key={li.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
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

              {/* Controls */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* −1 */}
                <form action={updateCartItemQuantity}>
                  <input type="hidden" name="domain" value={params.domain} />
                  <input type="hidden" name="itemId" value={li.id} />
                  <input type="hidden" name="quantity" value={Math.max(0, li.quantity - 1)} />
                  <button className="rounded border px-2 py-1 text-sm" type="submit">−</button>
                </form>

                {/* +1 */}
                <form action={updateCartItemQuantity}>
                  <input type="hidden" name="domain" value={params.domain} />
                  <input type="hidden" name="itemId" value={li.id} />
                  <input type="hidden" name="quantity" value={li.quantity + 1} />
                  <button className="rounded border px-2 py-1 text-sm" type="submit">+</button>
                </form>

                {/* set exact qty */}
                <form action={updateCartItemQuantity} className="flex items-center gap-1">
                  <input type="hidden" name="domain" value={params.domain} />
                  <input type="hidden" name="itemId" value={li.id} />
                  <input
                    name="quantity"
                    type="number"
                    min={0}
                    defaultValue={li.quantity}
                    className="w-20 rounded border px-2 py-1 text-sm"
                  />
                  <button className="rounded border px-2 py-1 text-sm" type="submit">Update</button>
                </form>

                {/* remove */}
                <form
                  action={removeCartItem}
      
                  className="ml-auto"
                >
                  <input type="hidden" name="domain" value={params.domain} />
                  <input type="hidden" name="itemId" value={li.id} />
                  <button className="rounded border px-2 py-1 text-sm" type="submit">Remove</button>
                </form>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-4 flex items-center justify-between">
        <div className="text-sm text-neutral-600">Subtotal</div>
        <div className="text-base font-semibold">{usd(order.subtotal)}</div>
      </div>

      <form action={startCheckout} className="pt-2">
        <input type="hidden" name="domain" value={params.domain} />
        <button className="rounded-lg bg-neutral-900 text-white px-4 py-2">
          Checkout
        </button>
      </form>
    </div>
  )
}
