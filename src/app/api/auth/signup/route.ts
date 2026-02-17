import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { signupSchema } from '@/lib/auth/validation'
import { jsonError } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { isSuperAdminEmail } from '@/lib/auth/superAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return jsonError('Invalid signup details.', 400)
    }

    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const email = parsed.data.email
    const password = parsed.data.password

    if (isSuperAdminEmail(email)) {
      const adminClient = createAdminSupabaseClient()
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (error && !error.message?.toLowerCase().includes('already registered')) {
        console.error('Super admin signup failed:', error.message)
        return jsonError('Unable to sign up.', 400)
      }

      let userId = data?.user?.id
      if (!userId) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (loginError || !loginData.user?.id) {
          return jsonError('Unable to sign in with existing account.', 400)
        }
        userId = loginData.user.id
      }

      await adminClient.from('profiles').upsert({ id: userId, role: 'admin' })
      await adminClient.from('user_roles').upsert({ user_id: userId, role: 'admin' })

      const response = NextResponse.json({ requiresEmailConfirmation: false })
      applyCookies(response)
      return response
    }

    const adminClient = createAdminSupabaseClient()
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error && !error.message?.toLowerCase().includes('already registered')) {
      console.error('Signup failed:', error.message)
      return jsonError('Unable to sign up.', 400)
    }

    if (!error && data?.user?.id) {
      await adminClient.from('user_roles').upsert({ user_id: data.user.id, role: 'customer' })
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      console.error('Signup auto-login failed:', loginError.message)
      return jsonError('Unable to complete sign up.', 400)
    }

    const response = NextResponse.json({ requiresEmailConfirmation: false })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('Signup handler error:', error)
    return jsonError('Unable to sign up.', 500)
  }
}
