import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { recoveryAccessCompleteSchema } from '@/lib/auth/validation'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'
import { verifySecurityAnswer } from '@/lib/auth/security-answer'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const INVALID_RECOVERY_MESSAGE = 'Recovery details are incorrect.'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-recovery-complete',
    max: 5,
    windowMs: 60_000,
    message: 'Too many recovery attempts. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = recoveryAccessCompleteSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError(INVALID_RECOVERY_MESSAGE, 400)
  }

  const accountEmail = parsed.data.accountEmail.trim().toLowerCase()
  const recoveryEmail = parsed.data.recoveryEmail.trim().toLowerCase()
  const answer = parsed.data.answer.trim()
  const question = parsed.data.question.trim()

  const matchedUser = await findAuthUserByEmail(accountEmail).catch(() => null)
  const metadata = matchedUser?.user_metadata || {}
  const security = metadata?.profile?.security || {}
  const storedRecoveryEmail = String(security?.recoveryEmail || '').trim().toLowerCase()
  const storedQuestion = String(security?.question || '').trim()
  const answerHash = String(metadata?.security_answer_hash || '').trim()
  const answerSalt = String(metadata?.security_answer_salt || '').trim()

  if (
    !matchedUser ||
    !storedRecoveryEmail ||
    storedRecoveryEmail !== recoveryEmail ||
    !storedQuestion ||
    storedQuestion !== question ||
    !verifySecurityAnswer({ answer, hash: answerHash, salt: answerSalt })
  ) {
    return jsonError(INVALID_RECOVERY_MESSAGE, 400)
  }

  const adminClient = createAdminSupabaseClient()
  const redirectTo = new URL('/reset-password', request.url).toString()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: accountEmail,
    options: { redirectTo },
  })

  if (error) {
    return jsonError('Unable to start recovery right now.', 503)
  }

  const recoveryUrl = String(data?.properties?.action_link || '').trim()
  if (!recoveryUrl) {
    return jsonError('Unable to start recovery right now.', 503)
  }

  return jsonOk({
    recoveryUrl,
  })
}
