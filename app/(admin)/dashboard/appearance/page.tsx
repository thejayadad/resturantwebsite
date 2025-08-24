export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

import { saveTheme, resetTheme } from '@/lib/actions/theme'
import { mergeTheme, type ThemeConfig } from '@/lib/theme/config'
import { themeToClasses } from '@/lib/theme/classes'

export default async function AppearancePage() {
  const session = await auth()
  const email = session?.user?.email

  const restaurant = email
    ? await prisma.restaurant.findUnique({
        where: { ownerEmail: email },
        select: { id: true, name: true, domain: true, appearance: true },
      })
    : null

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-3">
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="text-neutral-600 text-sm">No restaurant found.</p>
        <Link className="underline text-sm" href="/dashboard">← Back to Dashboard</Link>
      </div>
    )
  }

  // ✅ Coerce raw JSON from DB
  const t = mergeTheme(restaurant.appearance)
  const cls = themeToClasses(t)

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6" style={{ ['--accent' as any]: t.accentHex }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appearance</h1>
          <p className="text-sm text-neutral-500">
            Customize your public menu for <span className="font-medium">{restaurant.name}</span>
          </p>
        </div>
        <Link href="/dashboard" className="underline text-sm">Dashboard</Link>
      </div>

      {/* ───────────────────────────────────────────────
          PRESETS (separate form so only `preset` posts)
          ─────────────────────────────────────────────── */}
      <form action={saveTheme} className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">Quick presets</div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="preset" value="classic" className="rounded-lg border px-3 py-1 text-sm">Classic</button>
          <button type="submit" name="preset" value="cozy" className="rounded-lg border px-3 py-1 text-sm">Cozy</button>
          <button type="submit" name="preset" value="gallery" className="rounded-lg border px-3 py-1 text-sm">Gallery</button>
        </div>
      </form>

      {/* ───────────────────────────────────────────────
          CONTROLS (dedicated form for granular settings)
          ─────────────────────────────────────────────── */}
      <form action={saveTheme} className="rounded-2xl border p-4 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="text-neutral-600">Grid (sm)</span>
            <select name="gridSm" defaultValue={t.grid.sm} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value={1}>1 col</option>
              <option value={2}>2 cols</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Grid (md)</span>
            <select name="gridMd" defaultValue={t.grid.md} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Grid (lg)</span>
            <select name="gridLg" defaultValue={t.grid.lg} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="text-neutral-600">Gap</span>
            <select name="gap" defaultValue={t.gap} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value={3}>Tight</option><option value={4}>Comfy</option><option value={6}>Roomy</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Text Align</span>
            <select name="textAlign" defaultValue={t.textAlign} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="left">Left</option><option value="center">Center</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Card Style</span>
            <select name="cardStyle" defaultValue={t.cardStyle} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="soft">Soft</option><option value="solid">Solid</option><option value="outline">Outline</option>
            </select>
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="text-neutral-600">Accent Color</span>
            <input type="color" name="accentHex" defaultValue={t.accentHex} className="mt-1 h-10 w-full rounded-lg border p-1" />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">Show Images</span>
            <input type="checkbox" name="showImages" defaultChecked={t.showImages} className="mt-3 h-5 w-5" />
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-neutral-900 text-white px-4 py-2">Save</button>
          <button type="submit" formAction={resetTheme} className="rounded-lg border px-4 py-2">Reset to default</button>
          {restaurant.domain && (
            <a className="ml-auto underline text-sm" href={`/${restaurant.domain}/menu`} target="_blank">
              Open Menu
            </a>
          )}
        </div>
      </form>

      {/* Live server-side preview */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">Live Preview</div>
        {await PreviewGrid({ restaurantId: restaurant.id, theme: t })}
      </section>

      {/* Tiny debug block to verify what the server reads */}
      <details className="rounded-2xl border p-4 text-xs text-neutral-600">
        <summary>Debug: current theme JSON</summary>
        <pre className="mt-2 overflow-auto">{JSON.stringify(t, null, 2)}</pre>
      </details>
    </div>
  )
}

async function PreviewGrid({ restaurantId, theme }: { restaurantId: string; theme: ThemeConfig }) {
  const cls = themeToClasses(theme)
  const cats = await prisma.category.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      MenuItem: {
        where: { isAvailable: true },
        select: { id: true, title: true, description: true },
        take: 6,
      }
    }
  })

  return (
    <div className={cls.grid}>
      {cats.flatMap(c => c.MenuItem).slice(0, 8).map(it => (
        <article key={it.id} className={`${cls.card} p-4 ${cls.text}`}>
          <div className="font-semibold">{it.title}</div>
          {it.description ? <p className="text-sm text-neutral-600 mt-1">{it.description}</p> : null}
          <span className="inline-flex items-center mt-3 text-sm underline text-[--accent]">Preview link</span>
        </article>
      ))}
      {cats.every(c => c.MenuItem.length === 0) && (
        <div className="rounded-xl border p-6 text-sm text-neutral-500">No items yet to preview.</div>
      )}
    </div>
  )
}
