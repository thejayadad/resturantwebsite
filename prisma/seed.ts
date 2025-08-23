/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Helper: make a unique-ish demo restaurant name per email
const demoName = (email: string) => `Demo Restaurant - ${email}`

async function main() {
  // 1) Choose an owner email for the seed
  //    Prefer env var; else use the first user; else create a demo user.
  const envEmail = process.env.SEED_OWNER_EMAIL?.trim()
  let ownerEmail = envEmail || null

  if (!ownerEmail) {
    const first = await prisma.user.findFirst({ select: { email: true } })
    if (first?.email) ownerEmail = first.email
  }
  if (!ownerEmail) {
    ownerEmail = 'owner@example.com'
    await prisma.user.create({
      data: { email: ownerEmail, name: 'Demo Owner' },
    })
  }

  // 2) Restaurant (one per ownerEmail by your schema)
const restaurant = await prisma.restaurant.upsert({
  where: { ownerEmail },
  update: {},
  create: {
    ownerEmail,
    name: demoName(ownerEmail),
    tz: 'America/New_York',
    phone: '(555) 555-1212',
    addressLine1: '123 Harbor Ave',
    city: 'Seaville',
    state: 'NY',
    postalCode: '10001',
    description: 'Fresh seafood daily — demo data.',
  },
  select: { id: true, name: true, ownerEmail: true, domain: true },
})



  console.log('Restaurant:', restaurant)

  if (!restaurant.domain) {
  const base =
    process.env.SEED_DOMAIN?.trim() ||
    slugify(ownerEmail.split('@')[0] || 'demo')

  const unique = await ensureUniqueDomain(base)
  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { domain: unique },
  })
  console.log('Assigned domain:', unique)
}


  function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32) || 'demo'
}

async function ensureUniqueDomain(base: string) {
  let candidate = base || 'demo'
  let i = 1
  while (true) {
    const exists = await prisma.restaurant.findUnique({ where: { domain: candidate } })
    if (!exists) return candidate
    i += 1
    candidate = `${base}-${i}`
  }
}


  // 3) Categories
  const catLunch = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Lunch Specials' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Lunch Specials', sortOrder: 0 },
    select: { id: true, name: true },
  })
  const catPlates = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Seafood Plates' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Seafood Plates', sortOrder: 1 },
    select: { id: true, name: true },
  })
  const catFriedRice = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Fried Rice' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Fried Rice', sortOrder: 2 },
    select: { id: true, name: true },
  })
  const catSides = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Side Orders' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Side Orders', sortOrder: 3 },
    select: { id: true, name: true },
  })
  console.log('Categories:', { catLunch, catPlates, catFriedRice, catSides })

  // 4) Items (with optional codes unique per restaurant)
  // Seafood Plate (pick fish type)
  const fishPlate = await prisma.menuItem.upsert({
    where: { restaurantId_code: { restaurantId: restaurant.id, code: '12' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      categoryId: catPlates.id,
      code: '12',
      title: 'Fried Fish Plate',
      description: 'Choose your fish, prep, and sides.',
      isAvailable: true,
    },
    select: { id: true, title: true },
  })
  // Shrimp Plate
  const shrimpPlate = await prisma.menuItem.upsert({
    where: { restaurantId_code: { restaurantId: restaurant.id, code: '13' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      categoryId: catPlates.id,
      code: '13',
      title: 'Shrimp Plate',
      description: 'Crispy or grilled shrimp with sides.',
      isAvailable: true,
    },
    select: { id: true, title: true },
  })
  // Fried Rice (entrée)
  const friedRiceEntree = await prisma.menuItem.upsert({
    where: { restaurantId_code: { restaurantId: restaurant.id, code: 'FR1' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      categoryId: catFriedRice.id,
      code: 'FR1',
      title: 'Fried Rice (Entrée)',
      description: 'House fried rice with add-ons available.',
      isAvailable: true,
    },
    select: { id: true, title: true },
  })
  console.log('Items:', { fishPlate, shrimpPlate, friedRiceEntree })

  // 5) Variants (unique per item by name)
  async function ensureVariant(itemId: string, name: string, price: string, makeDefault = false) {
    const v = await prisma.menuItemVariant.upsert({
      where: { itemId_name: { itemId, name } },
      update: {},
      create: { itemId, name, price, isDefault: false },
      select: { id: true, isDefault: true },
    })
    if (makeDefault) {
      await prisma.menuItemVariant.updateMany({ where: { itemId }, data: { isDefault: false } })
      await prisma.menuItemVariant.update({ where: { id: v.id }, data: { isDefault: true } })
    }
  }
  await ensureVariant(fishPlate.id, 'Lunch', '10.99', true)
  await ensureVariant(fishPlate.id, 'Dinner', '14.99', false)
  await ensureVariant(shrimpPlate.id, 'Lunch', '11.99', true)
  await ensureVariant(shrimpPlate.id, 'Dinner', '15.99', false)
  await ensureVariant(friedRiceEntree.id, 'Regular', '8.99', true)
  await ensureVariant(friedRiceEntree.id, 'Large', '10.99', false)

  // 6) Option Groups
  const fishType = await prisma.optionGroup.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Fish Type' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Fish Type',
      selectionType: 'SINGLE',
      minSelect: 1,
      maxSelect: 1,
      description: 'Choose your fish.',
    },
    select: { id: true, name: true },
  })
  const prepStyle = await prisma.optionGroup.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Prep Style' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Prep Style',
      selectionType: 'SINGLE',
      minSelect: 1,
      maxSelect: 1,
      description: 'How should we prepare it?',
    },
    select: { id: true, name: true },
  })
  const sides = await prisma.optionGroup.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Sides' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Sides',
      selectionType: 'MULTI',
      minSelect: 0,
      maxSelect: 2,
      description: 'Pick up to two sides.',
    },
    select: { id: true, name: true },
  })
  const extras = await prisma.optionGroup.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Extras' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Extras',
      selectionType: 'MULTI',
      minSelect: 0,
      maxSelect: null,
      description: 'Optional add-ons.',
    },
    select: { id: true, name: true },
  })
  console.log('Groups:', { fishType, prepStyle, sides, extras })

  // 7) Options for each group
  async function ensureOption(groupId: string, name: string, delta: string) {
    return prisma.option.upsert({
      where: { groupId_name: { groupId, name } },
      update: {},
      create: { groupId, name, priceDelta: delta },
      select: { id: true, name: true },
    })
  }

  // Fish Type
  await ensureOption(fishType.id, 'Tilapia', '0')
  await ensureOption(fishType.id, 'Catfish', '0')
  await ensureOption(fishType.id, 'Whiting', '0')
  await ensureOption(fishType.id, 'Red Snapper', '3.00')

  // Prep Style
  await ensureOption(prepStyle.id, 'Fried', '0')
  await ensureOption(prepStyle.id, 'Grilled', '1.00')
  await ensureOption(prepStyle.id, 'Blackened', '1.00')
  await ensureOption(prepStyle.id, 'Lemon Pepper', '0.50')

  // Sides
  await ensureOption(sides.id, 'Fries', '0')
  await ensureOption(sides.id, 'Coleslaw', '0')
  await ensureOption(sides.id, 'Fried Rice', '2.00')
  await ensureOption(sides.id, 'Hush Puppies', '1.00')
  await ensureOption(sides.id, 'Mac & Cheese', '2.50')

  // Extras
  await ensureOption(extras.id, 'Extra Sauce', '0.50')
  await ensureOption(extras.id, 'Extra Lemon', '0.00')
  await ensureOption(extras.id, 'Add Shrimp', '4.00')

  // 8) Attach groups to items (MenuItemOptionGroup)
  async function attach(itemId: string, groupId: string, required: boolean, min: number, max: number | null) {
    // @@unique([itemId, groupId]) lets us upsert by composite key
    await prisma.menuItemOptionGroup.upsert({
      where: { itemId_groupId: { itemId, groupId } },
      update: { required, minSelect: min, maxSelect: max },
      create: { itemId, groupId, required, minSelect: min, maxSelect: max },
    })
  }

  // Fried Fish Plate: must choose Fish Type (1), Prep Style (1), Sides (1–2), Extras optional
  await attach(fishPlate.id, fishType.id, true, 1, 1) // SINGLE → 1
  await attach(fishPlate.id, prepStyle.id, true, 1, 1) // SINGLE → 1
  await attach(fishPlate.id, sides.id, true, 1, 2)
  await attach(fishPlate.id, extras.id, false, 0, null)

  // Shrimp Plate: no fish type; prep required; sides 1–2; extras optional
  await attach(shrimpPlate.id, prepStyle.id, true, 1, 1)
  await attach(shrimpPlate.id, sides.id, true, 1, 2)
  await attach(shrimpPlate.id, extras.id, false, 0, null)

  // Fried Rice (Entrée): only extras optional
  await attach(friedRiceEntree.id, extras.id, false, 0, null)

  console.log('✅ Seed complete for', ownerEmail)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

  