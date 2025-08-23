import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-5xl flex gap-4 p-3 text-sm">
          <Link href="/dashboard">Home</Link>
          <Link href="/dashboard/restaurant">Restaurant</Link>
          <Link href="/dashboard/categories">Categories</Link>
<Link href="/dashboard/menu">Menu</Link>
<Link href="/dashboard/options">Options</Link>

        </div>
      </nav>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  )
}
