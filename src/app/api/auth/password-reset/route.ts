import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonOk, jsonError } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const schema = z.object({
  email: z.string().trim().email().max(255),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Enter a valid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()
  const redirectTo = new URL('/reset-password', request.url).toString()

  try {
    const adminClient = createAdminSupabaseClient()
    const { error } = await adminClient.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      console.error('Password reset link request failed:', error.message)
      return jsonError('Unable to send reset link right now. Please try again.', 503)
    }
  } catch (error: any) {
    console.error('Password reset route error:', error?.message || error)
    return jsonError('Unable to send reset link right now. Please try again.', 503)
  }

  return jsonOk({
    sent: true,
    message: 'If an account exists for this email, a reset link has been sent.',
  })
}
