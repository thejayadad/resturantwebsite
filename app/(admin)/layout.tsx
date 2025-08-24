// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full bg-amber-200 grid grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="border-r p-4 space-y-3">
        <div className="text-lg font-bold">Admin</div>
        {/* <nav className="space-y-2 text-sm">
          <a className="block hover:underline" href="/dashboard">Overview</a>
          <a className="block hover:underline" href="/dashboard/categories">Categories</a>
          <a className="block hover:underline" href="/dashboard/items">Items</a>
          <a className="block hover:underline" href="/dashboard/orders">Orders</a>
          <a className="block hover:underline" href="/dashboard/kitchen">Kitchen</a>
          <a className="block hover:underline" href="/styleguide">Style Guide</a>
        </nav> */}
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}
