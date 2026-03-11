import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { recoveryAccessStartSchema } from '@/lib/auth/validation'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'

const INVALID_RECOVERY_MESSAGE = 'Recovery details are incorrect.'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = recoveryAccessStartSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError(INVALID_RECOVERY_MESSAGE, 400)
  }

  const accountEmail = parsed.data.accountEmail.trim().toLowerCase()
  const recoveryEmail = parsed.data.recoveryEmail.trim().toLowerCase()

  const matchedUser = await findAuthUserByEmail(accountEmail).catch(() => null)
  const security = matchedUser?.user_metadata?.profile?.security || {}
  const storedRecoveryEmail = String(security?.recoveryEmail || '').trim().toLowerCase()
  const question = String(security?.question || '').trim()

  if (!matchedUser || !storedRecoveryEmail || storedRecoveryEmail !== recoveryEmail || !question) {
    return jsonError(INVALID_RECOVERY_MESSAGE, 400)
  }

  return jsonOk({ question })
}
