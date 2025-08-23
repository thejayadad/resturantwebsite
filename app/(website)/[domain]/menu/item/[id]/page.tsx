import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/${params.domain}/menu`} className="text-sm underline">← Back to Menu</Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {item.title} {item.code ? <span className="text-sm text-neutral-500">({item.code})</span> : null}
        </h1>
        {item.description ? <p className="text-neutral-600">{item.description}</p> : null}
        <p className="text-sm text-neutral-500">From <span className="font-medium">{defaultPrice}</span></p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Options</h2>
        {attachments.length === 0 && <p className="text-sm text-neutral-500">No options for this item.</p>}
        {attachments.map(att => {
          const g = att.group
          if (!g.isActive) return null
          const effMin = att.minSelect ?? g.minSelect ?? 0
          const effMax = g.selectionType === 'SINGLE' ? 1 : (att.maxSelect ?? g.maxSelect ?? null)
          return (
            <div key={att.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-medium">
                  {g.name}{' '}
                  <span className="text-xs text-neutral-500">({g.selectionType}{att.required ? ', required' : ''})</span>
                </div>
                <div className="text-xs text-neutral-500">
                  {`Select ${effMin}${effMax ? `–${effMax}` : g.selectionType === 'SINGLE' ? ' of 1' : '+'}`}
                </div>
              </div>
              {g.description ? <p className="text-sm text-neutral-600">{g.description}</p> : null}
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.options.filter(o => o.isAvailable).map(o => (
                  <li key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{o.name}</span>
                    <span className="text-xs text-neutral-600">
                      {Number(o.priceDelta) > 0 ? `+ ${formatUSD(o.priceDelta.toString())}` : ''}
                    </span>
                  </li>
                ))}
                {g.options.length === 0 && <li className="text-sm text-neutral-500">No choices available.</li>}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
