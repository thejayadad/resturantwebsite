'use server'

import { redirect } from 'next/navigation'
import { getOrCreateRestaurantForCurrentUser } from '@/lib/server/restaurants'

export async function goToMyRestaurantSettings(): Promise<void> {
  await getOrCreateRestaurantForCurrentUser()
  redirect('/dashboard/restaurant')
}

