import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

/**
 * Returns the current user's restaurant or creates one.
 * Owner relation is by email (Restaurant.ownerEmail -> User.email).
 */
export async function getOrCreateRestaurantForCurrentUser() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error('Must be signed in')

  // Find by unique constraint on ownerEmail
  const existing = await prisma.restaurant.findUnique({
    where: { ownerEmail: email },
  })
  if (existing) return existing

  // Generate a unique name (name is globally unique)
  const base =
    (session?.user?.name && `${session.user.name}'s Restaurant`) ||
    `${email.split('@')[0]}'s Restaurant`

  const uniqueName = await findUniqueRestaurantName(base)

  // Create with minimal data; location fields use defaults from schema
  return prisma.restaurant.create({
    data: {
      ownerEmail: email,
      name: uniqueName,
      // domain stays null until owner sets it
      // address/tz/isActive use model defaults
    },
  })
}

/** Ensures the restaurant name is globally unique. */
async function findUniqueRestaurantName(base: string): Promise<string> {
  const clean = (base || 'My Restaurant').trim()
  // Try "Base", "Base 2", "Base 3", ... then random suffix
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? clean : `${clean} ${i + 1}`
    const hit = await prisma.restaurant.findUnique({ where: { name: candidate } })
    if (!hit) return candidate
  }
  return `${clean}-${Math.random().toString(36).slice(2, 7)}`
}
