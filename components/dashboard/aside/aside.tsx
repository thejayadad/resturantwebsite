'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { DASHBOARD_NAV } from './aside-data'

/** Robust matcher: exact path or section prefix (with boundary) */
function isPathActive(pathname: string, href: string) {
  if (pathname === href) return true
  // treat /dashboard/orders/123 as active for /dashboard/orders
  if (pathname.startsWith(href.endsWith('/') ? href : href + '/')) return true
  return false
}

type NavButtonProps = {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}

/** Single nav row (icon-only on small, icon+label on lg) */
function NavButton({ href, label, icon: Icon, active }: NavButtonProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // base
        'group flex items-center gap-0 lg:gap-3 rounded-xl px-3 py-2 transition',
        'text-neutral-700 hover:bg-neutral-50',
        // width/spacing differs by breakpoint
        'justify-center lg:justify-start',
        // active state
        active && 'bg-neutral-100 text-neutral-900 ring-1 ring-neutral-200'
      )}
      data-active={active ? 'true' : 'false'}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
        )}
      />
      <span className="hidden lg:inline text-sm">{label}</span>
    </Link>
  )
}

export default function Aside() {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'h-full bg-white w-full',
        'px-2 lg:px-3 py-4'
      )}
    >
      {/* Brand / logo area */}
      <div className="mb-4 flex items-center justify-center lg:justify-start">
        {/* Replace with your logo */}
        <div className="h-8 w-8 rounded-lg bg-neutral-900" />
        <span className="ml-3 hidden lg:inline font-semibold">Admin</span>
      </div>

      <nav className="space-y-1">
        {DASHBOARD_NAV.map(item => (
          <NavButton
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isPathActive(pathname, item.href)}
          />
        ))}
      </nav>

    </aside>
  )
}
