import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function formatUSD(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default async function TenantMenuPage({ params }: { params: { domain: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { domain: params.domain },
    select: { id: true, name: true },
  })
  if (!restaurant) return notFound()

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, isAvailable: true },
    orderBy: [{ categoryId: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      code: true,
      description: true,
      categoryId: true,
      variants: {
        select: { id: true, name: true, price: true, isDefault: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const displayPrice = (variants: { price: any; isDefault: boolean }[]) => {
    const def = variants.find(v => v.isDefault)
    const price = (def ?? variants[0])?.price
    return price ? formatUSD(price.toString()) : ''
  }

  const itemsByCategory = new Map<string | null, typeof items>()
  for (const it of items) {
    const key = it.categoryId ?? null
    const arr = itemsByCategory.get(key) ?? []
    arr.push(it)
    itemsByCategory.set(key, arr)
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-neutral-500">Browse our menu</p>
      </header>

      {categories.map(cat => {
        const list = itemsByCategory.get(cat.id) ?? []
        if (list.length === 0) return null
        return (
          <section key={cat.id} className="space-y-4">
            <h2 className="text-xl font-semibold">{cat.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map(item => (
                <Link
                  key={item.id}
                  href={`/${params.domain}/menu/item/${item.id}`}
                  className="rounded-xl border p-4 hover:bg-neutral-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {item.title}{' '}
                        {item.code ? <span className="text-xs text-neutral-500">({item.code})</span> : null}
                      </div>
                      {item.description ? (
                        <div className="text-sm text-neutral-600 mt-1">{item.description}</div>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      {displayPrice(item.variants)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      {(() => {
        const unassigned = itemsByCategory.get(null) ?? []
        if (unassigned.length === 0) return null
        return (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Other Items</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {unassigned.map(item => (
                <Link
                  key={item.id}
                  href={`/${params.domain}/menu/item/${item.id}`}
                  className="rounded-xl border p-4 hover:bg-neutral-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      {item.description ? (
                        <div className="text-sm text-neutral-600 mt-1">{item.description}</div>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      {displayPrice(item.variants)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })()}
    </div>
  )
}
