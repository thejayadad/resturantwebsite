import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createGroup, updateGroup, deleteGroup, createOption, updateOption, deleteOption } from '@/lib/actions/options'

export default async function OptionsPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return redirect('/')

  // ensure restaurant
  let restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
    select: { id: true, name: true },
  })
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { ownerEmail: email, name: session?.user?.name ? `${session.user.name}'s Restaurant` : 'My Restaurant' },
      select: { id: true, name: true },
    })
  }

  const groups = await prisma.optionGroup.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true, name: true, description: true, selectionType: true, minSelect: true, maxSelect: true, isActive: true,
      options: { select: { id: true, name: true, priceDelta: true, isAvailable: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
    },
  })

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Option Library</h1>
          <p className="text-sm text-neutral-500">Fish Type, Prep Style, Sides, Extras…</p>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard/menu" className="text-sm underline">Menu</Link>
          <Link href="/dashboard/categories" className="text-sm underline">Categories</Link>
        </div>
      </div>

      {/* Create group */}
      <form action={createGroup} className="rounded-2xl border p-4 grid gap-3 md:grid-cols-6">
        <input name="name" placeholder="Group name (e.g., Fish Type)" className="rounded-lg border px-3 py-2 md:col-span-2" />
        <select name="selectionType" className="rounded-lg border px-3 py-2">
          <option value="SINGLE">Single</option>
          <option value="MULTI">Multiple</option>
        </select>
        <input name="minSelect" type="number" min={0} defaultValue={0} className="rounded-lg border px-3 py-2" placeholder="Min" />
        <input name="maxSelect" type="number" min={0} className="rounded-lg border px-3 py-2" placeholder="Max (blank = no max)" />
        <input name="description" placeholder="Optional description" className="rounded-lg border px-3 py-2 md:col-span-2" />
        <div className="md:col-span-6">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">Add Group</button>
        </div>
      </form>

      {/* Groups list */}
      <div className="space-y-6">
        {groups.length === 0 && <p className="text-sm text-neutral-500">No groups yet. Create your first one above.</p>}

        {groups.map(g => (
          <div key={g.id} className="rounded-2xl border p-4 space-y-4">
            <form action={updateGroup} className="grid gap-3 md:grid-cols-6 items-end">
              <input type="hidden" name="id" value={g.id} />
              <label className="block md:col-span-2">
                <span className="text-sm font-medium">Name</span>
                <input name="name" defaultValue={g.name} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Type</span>
                <select name="selectionType" defaultValue={g.selectionType} className="mt-1 w-full rounded-lg border px-3 py-2">
                  <option value="SINGLE">Single</option>
                  <option value="MULTI">Multiple</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Min</span>
                <input name="minSelect" type="number" min={0} defaultValue={g.minSelect ?? 0} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Max</span>
                <input name="maxSelect" type="number" min={0} defaultValue={g.maxSelect ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium">Description</span>
                <input name="description" defaultValue={g.description ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={g.isActive} />
                Active
              </label>
              <div className="md:col-span-6 flex gap-2">
                <button className="rounded border px-3 py-2 text-sm" type="submit">Save Group</button>
         
              </div>
            </form>
                 <div>
                      <form action={deleteGroup}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="rounded border px-3 py-2 text-sm hover:bg-red-50" type="submit">Delete Group</button>
                </form>
              </div>

            {/* Options in this group */}
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">Options</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2 w-32">Price Δ</th>
                      <th className="px-2 py-2 w-28">Status</th>
                      <th className="px-2 py-2 w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.options.map(o => (
                      <tr key={o.id} className="border-t">
                        <td className="px-2 py-2">
                          <form action={updateOption} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={o.id} />
                            <input name="name" defaultValue={o.name} className="rounded border px-2 py-1" />
                            <input name="priceDelta" defaultValue={o.priceDelta.toString()} className="rounded border px-2 py-1 w-24" />
                            <label className="inline-flex items-center gap-2">
                              <input type="checkbox" name="isAvailable" defaultChecked={o.isAvailable} />
                              <span className="text-xs">Available</span>
                            </label>
                            <button className="rounded border px-2 py-1" type="submit">Save</button>
                          </form>
                        </td>
                        <td className="px-2 py-2">${o.priceDelta.toString()}</td>
                        <td className="px-2 py-2">{o.isAvailable ? 'Available' : 'Hidden'}</td>
                        <td className="px-2 py-2">
                          <form action={deleteOption}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded border px-2 py-1">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {g.options.length === 0 && (
                      <tr><td className="px-2 py-3 text-neutral-500" colSpan={4}>No options yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add option */}
              <form action={createOption} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="groupId" value={g.id} />
                <label className="block">
                  <span className="text-xs text-neutral-500">Name</span>
                  <input name="name" placeholder="Tilapia" className="mt-1 rounded border px-2 py-1" />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Price Δ</span>
                  <input name="priceDelta" placeholder="0.00" className="mt-1 rounded border px-2 py-1 w-24" />
                </label>
                <button className="rounded border px-3 py-1 text-sm" type="submit">Add Option</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
