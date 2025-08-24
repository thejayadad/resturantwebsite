import Aside from "@/components/dashboard/aside/aside";

// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full bg-neutral-50 grid grid-cols-12 w-full">
      <aside className="border-r border-border-dotted border-neutral-100 h-full col-span-2 w-full flex items-center flex-col">
        <Aside />
      </aside>
        <main className="col-span-10 w-full grid">{children}</main>
    </div>
  )
}
