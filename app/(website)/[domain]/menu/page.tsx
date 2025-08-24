export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { themeToClasses } from '@/lib/theme/classes'
import type { ThemeConfig } from '@/lib/theme/config' 

export default async function TenantMenuPage({ params }: { params: { domain: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { domain: params.domain },
    select: { id: true, name: true, appearance: true },
  })
  if (!restaurant) return <div className="p-6">Restaurant not found.</div>

  const t = (restaurant.appearance as ThemeConfig) ?? {
    grid: { sm: 1, md: 2, lg: 3 },
    gap: 4, textAlign: 'left', cardStyle:'soft', showImages:true, accentHex:'#0284c7'
  }
  const cls = themeToClasses(t)

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, name: true,
      MenuItem: {
        where: { isAvailable: true },
        select: { id: true, title: true, description: true, code: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8" style={{ ['--accent' as any]: t.accentHex }}>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <Link href={`/${params.domain}/cart`} className="underline text-sm">Cart</Link>
      </header>

      {categories.map(cat => (
        <section key={cat.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{cat.name}</h2>
          <div className={cls.grid}>
            {cat.MenuItem.map(it => (
              <article key={it.id} className={`${cls.card} p-4 ${cls.text}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{it.title}</h3>
                  {it.code ? <span className="text-xs text-neutral-500">{it.code}</span> : null}
                </div>
                {it.description ? <p className="text-sm text-neutral-600 mt-1">{it.description}</p> : null}
                <a
                  href={`/${params.domain}/menu/item/${it.id}`}
                  className="inline-flex items-center mt-3 text-sm underline text-[--accent]"
                >
                  View options
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
