import { auth } from '@/auth'
import SignIn from '@/components/ui/auth/signin-btn'
import { goToMyRestaurantSettings } from '@/lib/server/go-to'

import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  const userEmail = session?.user?.email

  if (!userEmail) {
    return (
      <div className="p-6">
        <p className="mb-3">Please sign in to manage your restaurant.</p>
        <SignIn />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-neutral-500">Signed in as {userEmail}</p>

      {/* Recommended: create-if-needed when clicked, then go to settings */}
      <form action={goToMyRestaurantSettings}>
        <button
          type="submit"
          className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
        >
          Restaurant Settings
        </button>
      </form>

      {/* Optional direct link if you already created the page */}
      <div>
        <Link href="/dashboard/restaurant" className="text-sm underline">
          Open settings directly
        </Link>
      </div>
    </div>
  )
}
