import type { NextRequest } from 'next/server'
import { authEmailLookupSchema } from '@/lib/auth/validation'
import { jsonError, jsonOk } from '@/lib/http/response'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-customer-status',
    max: 12,
    windowMs: 60_000,
    message: 'Too many account lookups. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = authEmailLookupSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Enter a valid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()

  try {
    const user = await findAuthUserByEmail(email)
    if (!user?.id) {
      return jsonOk({ nextStep: 'signup' })
    }

    const adminClient = createAdminSupabaseClient()
    const roleInfo = await getUserRoleInfoSafe(adminClient, user.id, user.email || email)

    return jsonOk({
      nextStep: 'password',
      role: roleInfo.role,
    })
  } catch (error) {
    console.error(
      'Customer auth status lookup failed:',
      error instanceof Error ? error.message : error,
    )
    return jsonError('Unable to continue right now.', 500)
  }
}
