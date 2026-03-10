import type { User } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const USERS_PER_PAGE = 200
const MAX_PAGES = 10

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return null

  const adminClient = createAdminSupabaseClient()

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    })

    if (error) {
      throw error
    }

    const users = Array.isArray(data?.users) ? data.users : []
    const matchedUser = users.find((user) => user.email?.toLowerCase() === normalizedEmail) || null
    if (matchedUser) {
      return matchedUser
    }

    if (users.length < USERS_PER_PAGE) {
      break
    }
  }

  return null
}
