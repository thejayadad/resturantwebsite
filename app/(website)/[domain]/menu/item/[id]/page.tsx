// app/[domain]/menu/item/[id]/page.tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addToCart } from '@/lib/actions/add-to-cart' // ✅ your action

function formatUSD(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default async function TenantItemPage({ params }: { params: { domain: string; id: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { domain: params.domain },
    select: { id: true, name: true },
  })
  if (!restaurant) return notFound()

  const item = await prisma.menuItem.findFirst({
    where: { id: params.id, restaurantId: restaurant.id },
    select: {
      id: true,
      title: true,
      description: true,
      code: true,
      variants: { select: { id: true, name: true, price: true, isDefault: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!item) return notFound()

  const attachments = await prisma.menuItemOptionGroup.findMany({
    where: { itemId: item.id },
    select: {
      id: true,
      required: true,
      minSelect: true,
      maxSelect: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          selectionType: true,
          minSelect: true,
          maxSelect: true,
          isActive: true,
          options: {
            select: { id: true, name: true, priceDelta: true, isAvailable: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  const defaultPrice = (() => {
    const def = item.variants.find(v => v.isDefault)
    const price = (def ?? item.variants[0])?.price
    return price ? formatUSD(price.toString()) : ''
  })()

  // app/[domain]/menu/item/[id]/page.tsx  (only the return block shown)
return (
  <div className="mx-auto max-w-3xl p-6 space-y-6">
    <div className="flex items-center justify-between">
      <Link href={`/${params.domain}/menu`} className="text-sm underline">← Back to Menu</Link>
      <Link href={`/${params.domain}/cart`} className="text-sm underline">View cart</Link>
    </div>

    <div className="space-y-1">
      <h1 className="text-2xl font-bold">
        {item.title} {item.code ? <span className="text-sm text-neutral-500">({item.code})</span> : null}
      </h1>
      {item.description ? <p className="text-neutral-600">{item.description}</p> : null}
      <p className="text-sm text-neutral-500">From <span className="font-medium">{defaultPrice}</span></p>
    </div>

    {/* ✅ One form that includes options + qty + submit */}
    <form action={addToCart} className="space-y-6">
      <input type="hidden" name="domain" value={params.domain} />
      <input type="hidden" name="itemId" value={item.id} />

      {/* Options */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Options</h2>
        {attachments.length === 0 && <p className="text-sm text-neutral-500">No options for this item.</p>}

        {attachments.map(att => {
          const g = att.group
          if (!g.isActive) return null
          const effMin = att.minSelect ?? g.minSelect ?? 0
          const effMax = g.selectionType === 'SINGLE' ? 1 : (att.maxSelect ?? g.maxSelect ?? null)

          return (
            <div key={att.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-medium">
                  {g.name}{' '}
                  <span className="text-xs text-neutral-500">
                    ({g.selectionType}{att.required ? ', required' : ''})
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {`Select ${effMin}${effMax ? `–${effMax}` : g.selectionType === 'SINGLE' ? ' of 1' : '+'}`}
                </div>
              </div>
              {g.description ? <p className="text-sm text-neutral-600">{g.description}</p> : null}

              {/* REAL inputs now */}
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.options.filter(o => o.isAvailable).map(o => (
                  <li key={o.id} className="rounded-lg border">
                    <label className="flex items-center justify-between px-3 py-2 gap-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {g.selectionType === 'SINGLE' ? (
                          <input
                            type="radio"
                            name={`opt_${g.id}`}
                            value={o.id}
                            required={att.required} // HTML-level minimal enforcement
                          />
                        ) : (
                          <input
                            type="checkbox"
                            name={`opt_${g.id}[]`}
                            value={o.id}
                          />
                        )}
                        <span className="text-sm">{o.name}</span>
                      </div>
                      <span className="text-xs text-neutral-600">
                        {Number(o.priceDelta) > 0 ? `+ ${formatUSD(o.priceDelta.toString())}` : ''}
                      </span>
                    </label>
                  </li>
                ))}
                {g.options.length === 0 && (
                  <li className="text-sm text-neutral-500">No choices available.</li>
                )}
              </ul>
            </div>
          )
        })}
      </section>

      {/* Qty + submit */}
      <div className="border-t pt-4 flex items-center gap-3">
        <label className="text-sm">
          Qty:{' '}
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            className="w-16 rounded border px-2 py-1 text-sm"
          />
        </label>
        <button className="rounded-lg bg-neutral-900 text-white px-4 py-2">
          Add to cart
        </button>
      </div>
    </form>
  </div>
)

}
