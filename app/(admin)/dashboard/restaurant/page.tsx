import { updateRestaurant } from '@/lib/actions/restaurant-update'
import { getOrCreateRestaurantForCurrentUser } from '@/lib/server/restaurants'
import Link from 'next/link'

export default async function AdminRestaurantPage() {
  const restaurant = await getOrCreateRestaurantForCurrentUser()

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurant Settings</h1>
          <p className="text-sm text-neutral-500">
            Update your business profile, domain, and pickup address.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">Admin Home</Link>
      </div>

      <form action={updateRestaurant} className="space-y-4 rounded-2xl border border-neutral-200 border-border-dotted p-4">
        <input type="hidden" name="id" value={restaurant.id} />

        <label className="block">
          <span className="text-sm font-medium">Name *</span>
          <input name="name" defaultValue={restaurant.name} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Domain</span>
          <input
            name="domain"
            defaultValue={restaurant.domain ?? ''}
            placeholder="yourbrand.com"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          <p className="mt-1 text-xs text-neutral-500">Must be unique across the platform.</p>
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Phone</span>
            <input name="phone" defaultValue={restaurant.phone ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Time Zone</span>
            <input name="tz" defaultValue={restaurant.tz} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Address Line 1</span>
            <input name="addressLine1" defaultValue={restaurant.addressLine1} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Address Line 2</span>
            <input name="addressLine2" defaultValue={restaurant.addressLine2 ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium">City</span>
            <input name="city" defaultValue={restaurant.city} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">State</span>
            <input name="state" defaultValue={restaurant.state} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Postal Code</span>
            <input name="postalCode" defaultValue={restaurant.postalCode} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={restaurant.isActive} />
          <span className="text-sm">Active</span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
          <span className="text-xs text-neutral-500">Name & domain are unique.</span>
        </div>
      </form>
    </div>
  )
}
