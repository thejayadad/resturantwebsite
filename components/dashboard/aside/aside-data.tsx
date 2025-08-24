import type { ElementType } from 'react'
import {
  LayoutDashboard, ListOrdered, Package, SlidersHorizontal,
  ShoppingBasket, CookingPot, Palette, Settings
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: ElementType
}

export const DASHBOARD_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',            icon: LayoutDashboard },
  { label: 'Categories', href: '/dashboard/categories',  icon: ListOrdered },
  { label: 'Items',      href: '/dashboard/items',       icon: Package },
  { label: 'Options',    href: '/dashboard/options',     icon: SlidersHorizontal },
  { label: 'Orders',     href: '/dashboard/orders',      icon: ShoppingBasket },
  { label: 'Kitchen',    href: '/dashboard/kitchen',     icon: CookingPot },
  { label: 'Appearance', href: '/dashboard/appearance',  icon: Palette },
  { label: 'Settings',   href: '/dashboard/settings',    icon: Settings },
]
