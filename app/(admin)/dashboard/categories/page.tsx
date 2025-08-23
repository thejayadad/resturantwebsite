import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createCategory, updateCategory, deleteCategory, moveCategory } from '@/lib/actions/category'
import { redirect } from 'next/navigation'

export default async function AdminCategoriesPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return redirect('/')

  // ensure restaurant exists
  let restaurant = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
    select: { id: true, name: true },
  })
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        ownerEmail: email,
        name: session?.user?.name ? `${session.user.name}'s Restaurant` : 'My Restaurant',
      },
      select: { id: true, name: true },
    })
  }

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, sortOrder: true, isActive: true, createdAt: true },
  })

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-neutral-500">Manage sections for {restaurant.name}.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurant" className="text-sm underline">Restaurant</Link>
          <Link href="/admin" className="text-sm underline">Admin Home</Link>
        </div>
      </div>

      {/* Create */}
      <form action={createCategory} className="flex items-center gap-2 rounded-2xl border p-4">
        <input
          name="name"
          placeholder="e.g., Lunch Specials"
          className="w-full rounded-lg border px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Add
        </button>
      </form>

      {/* List */}
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full table-auto">
          <thead className="text-left text-sm text-neutral-500">
            <tr>
              <th className="px-4 py-3 w-16">Sort</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 w-28">Status</th>
              <th className="px-4 py-3 w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button className="rounded border px-2 py-1 text-xs" disabled={i===0}>↑</button>
                    </form>
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button className="rounded border px-2 py-1 text-xs" disabled={i===categories.length-1}>↓</button>
                    </form>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <form action={updateCategory} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input type="checkbox" name="isActive" defaultChecked={c.isActive} />
                      Active
                    </label>
                    <button className="rounded border px-3 py-1 text-sm" type="submit">Save</button>
                  </form>
                </td>

                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {c.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded border px-3 py-1 text-sm hover:bg-red-50" type="submit">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-neutral-500" colSpan={4}>
                  No categories yet. Create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500">
        Tip: Order categories to control display order on the menu.
      </p>
    </div>
  )
}
