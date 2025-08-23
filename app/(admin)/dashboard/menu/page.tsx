import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Item & Variant actions
import {
  createItem,
  updateItem,
  deleteItem,
  addVariant,
  setDefaultVariant,
  deleteVariant,
} from '@/lib/actions/items'

// Option attachment actions
import {
  attachGroupToItem,
  updateAttachment,
  detachGroupFromItem,
} from '@/lib/actions/options'

export default async function MenuPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return redirect('/')

  // Ensure restaurant exists for this owner
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

  // Categories (for assigning items)
  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  // Items + variants
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ categoryId: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      code: true,
      description: true,
      isAvailable: true,
      categoryId: true,
      variants: {
        select: { id: true, name: true, price: true, isDefault: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // All active option groups for this restaurant (to attach)
  const groups = await prisma.optionGroup.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      selectionType: true,
      minSelect: true,
      maxSelect: true,
    },
  })

  // Current attachments per item
  const itemAttachments = await prisma.menuItemOptionGroup.findMany({
    where: { itemId: { in: items.map((i) => i.id) } },
    select: {
      id: true,
      itemId: true,
      required: true,
      minSelect: true,
      maxSelect: true,
      group: {
        select: {
          id: true,
          name: true,
          selectionType: true,
          minSelect: true,
          maxSelect: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  // Group attachments by item for quick lookup
  const attachmentsByItem = new Map<string, typeof itemAttachments>()
  for (const a of itemAttachments) {
    const arr = attachmentsByItem.get(a.itemId) ?? []
    arr.push(a)
    attachmentsByItem.set(a.itemId, arr)
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-sm text-neutral-500">Items &amp; variants for {restaurant.name}</p>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard/restaurant" className="text-sm underline">
            Restaurant
          </Link>
          <Link href="/dashboard/categories" className="text-sm underline">
            Categories
          </Link>
          <Link href="/dashboard/options" className="text-sm underline">
            Options
          </Link>
        </div>
      </div>

      {/* Create item */}
      <form action={createItem} className="rounded-2xl border p-4 grid gap-3 md:grid-cols-4">
        <input
          name="title"
          placeholder="Item title (e.g., Fried Shrimp)"
          className="rounded-lg border px-3 py-2 md:col-span-2"
        />
        <input name="code" placeholder="Code (e.g., 12B)" className="rounded-lg border px-3 py-2" />
        <select name="categoryId" className="rounded-lg border px-3 py-2">
          <option value="">— Unassigned —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <textarea
          name="description"
          placeholder="Optional description"
          rows={2}
          className="rounded-lg border px-3 py-2 md:col-span-4"
        />
        <div className="md:col-span-4">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            Add Item
          </button>
        </div>
      </form>

      {/* Items list */}
      <div className="space-y-6">
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">No items yet. Create your first one above.</p>
        )}

        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Edit item */}
              <form action={updateItem} className="flex-1 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={item.id} />
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">Title</span>
                  <input
                    name="title"
                    defaultValue={item.title}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Code</span>
                  <input
                    name="code"
                    defaultValue={item.code ?? ''}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">Description</span>
                  <input
                    name="description"
                    defaultValue={item.description ?? ''}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Category</span>
                  <select
                    name="categoryId"
                    defaultValue={item.categoryId ?? ''}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">— Unassigned —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-1 inline-flex items-center gap-2">
                  <input type="checkbox" name="isAvailable" defaultChecked={item.isAvailable} />
                  <span className="text-sm">Available</span>
                </label>
                <div className="md:col-span-3">
                  <button className="rounded border px-3 py-2 text-sm" type="submit">
                    Save Item
                  </button>
                </div>
              </form>

              {/* Delete item */}
              <form
                action={deleteItem}
           
              >
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded border px-3 py-2 text-sm hover:bg-red-50">Delete</button>
              </form>
            </div>

            {/* Variants */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Variants</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2 w-32">Price</th>
                      <th className="px-2 py-2 w-28">Default</th>
                      <th className="px-2 py-2 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.variants.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-2 py-2">{v.name}</td>
                        <td className="px-2 py-2">${v.price.toString()}</td>
                        <td className="px-2 py-2">
                          <form action={setDefaultVariant}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="variantId" value={v.id} />
                            <button
                              className={`rounded px-2 py-1 border ${
                                v.isDefault ? 'bg-green-50' : ''
                              }`}
                              type="submit"
                            >
                              {v.isDefault ? 'Default' : 'Make Default'}
                            </button>
                          </form>
                        </td>
                        <td className="px-2 py-2">
                          <form
                     
                          >
                            <input type="hidden" name="id" value={v.id} />
                            <button className="rounded border px-2 py-1">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {item.variants.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-neutral-500" colSpan={4}>
                          No variants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add variant */}
              <form action={addVariant} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="itemId" value={item.id} />
                <label className="block">
                  <span className="text-xs text-neutral-500">Name</span>
                  <input name="name" placeholder="Lunch" className="mt-1 rounded border px-2 py-1" />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Price</span>
                  <input name="price" placeholder="9.99" className="mt-1 rounded border px-2 py-1" />
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="makeDefault" />
                  <span className="text-xs">Make default</span>
                </label>
                <button className="rounded border px-3 py-1 text-sm" type="submit">
                  Add Variant
                </button>
              </form>
            </div>

            {/* Attached option groups */}
            <div className="mt-6 rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">Attached Option Groups</div>

              {/* Existing attachments */}
              <div className="space-y-2">
                {(attachmentsByItem.get(item.id) ?? []).map((att) => (
                  <div
                    key={att.id}
                    className="flex flex-wrap items-center gap-3 border rounded-lg p-2"
                  >
                    <div className="font-medium">
                      {att.group.name}{' '}
                      <span className="text-xs text-neutral-500">
                        ({att.group.selectionType})
                      </span>
                    </div>
                    <form action={updateAttachment} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={att.id} />
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input type="checkbox" name="required" defaultChecked={att.required} />
                        Required
                      </label>
                      <input
                        name="minSelect"
                        type="number"
                        min={0}
                        defaultValue={att.minSelect}
                        className="w-20 rounded border px-2 py-1 text-sm"
                      />
                      <input
                        name="maxSelect"
                        type="number"
                        min={0}
                        defaultValue={att.maxSelect ?? ''}
                        className="w-20 rounded border px-2 py-1 text-sm"
                        placeholder="Max"
                      />
                      <button className="rounded border px-2 py-1 text-sm" type="submit">
                        Save
                      </button>
                    </form>
                    <form
                      action={detachGroupFromItem}
                      className="ml-auto"
                
                    >
                      <input type="hidden" name="id" value={att.id} />
                      <button className="rounded border px-2 py-1 text-sm">Detach</button>
                    </form>
                  </div>
                ))}
                {(attachmentsByItem.get(item.id) ?? []).length === 0 && (
                  <p className="text-sm text-neutral-500">No groups attached.</p>
                )}
              </div>

              {/* Attach a new group */}
              <form action={attachGroupToItem} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="itemId" value={item.id} />
                <label className="block">
                  <span className="text-xs text-neutral-500">Group</span>
                  <select name="groupId" className="mt-1 rounded border px-2 py-1">
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.selectionType})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="required" />
                  <span className="text-xs">Required</span>
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Min</span>
                  <input
                    name="minSelect"
                    type="number"
                    min={0}
                    className="mt-1 rounded border px-2 py-1 w-20"
                    defaultValue={0}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Max</span>
                  <input
                    name="maxSelect"
                    type="number"
                    min={0}
                    className="mt-1 rounded border px-2 py-1 w-20"
                    placeholder="(blank = group max)"
                  />
                </label>
                <button className="rounded border px-3 py-1 text-sm" type="submit">
                  Attach
                </button>
              </form>

              {groups.length === 0 && (
                <p className="mt-2 text-xs text-neutral-500">
                  You have no option groups yet. Create them in{' '}
                  <Link className="underline" href="/dashboard/options">
                    Options
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
