import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'

const safeText = (value: unknown) => String(value || '').trim()

const readGeneratedLinkProperties = (data: any) => {
  const properties = data?.properties || {}
  const actionLink = safeText(properties.action_link)
  const emailOtp = safeText(properties.email_otp)
  const hashedToken = safeText(properties.hashed_token)

  if (!actionLink) {
    throw new Error('Unable to generate secure email link.')
  }

  return {
    actionLink,
    emailOtp,
    hashedToken,
  }
}

export const generateRecoveryEmailLink = async ({
  email,
  redirectTo,
}: {
  email: string
  redirectTo: string
}) => {
  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: safeText(email).toLowerCase(),
    options: {
      redirectTo: safeText(redirectTo),
    },
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate recovery link.')
  }

  const generated = readGeneratedLinkProperties(data)

  // action_link is a PKCE `?code=` URL under this project's browser client
  // config, which requires a code-verifier cookie that only exists if
  // resetPasswordForEmail() ran in the recipient's own browser. Since this
  // link is generated server-side via the admin API, no such cookie is ever
  // set, so exchangeCodeForSession() on the reset-password page silently
  // fails for anyone who isn't already logged in. Route through the
  // token_hash + type=recovery flow instead (verifyOtp), which the
  // reset-password page already supports and doesn't depend on any
  // browser-local state from the request that generated the link.
  if (!generated.hashedToken) {
    return generated
  }
  const tokenHashUrl = new URL(redirectTo)
  tokenHashUrl.searchParams.set('token_hash', generated.hashedToken)
  tokenHashUrl.searchParams.set('type', 'recovery')

  return { ...generated, actionLink: tokenHashUrl.toString() }
}

export const generateMagicLinkEmailLink = async ({
  email,
  redirectTo,
}: {
  email: string
  redirectTo: string
}) => {
  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: safeText(email).toLowerCase(),
    options: {
      redirectTo: safeText(redirectTo),
    },
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate verification link.')
  }

  return readGeneratedLinkProperties(data)
}

export const ensureAuthUserExistsForMagicLink = async (email: string) => {
  const normalizedEmail = safeText(email).toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Email address is required.')
  }

  const existingUser = await findAuthUserByEmail(normalizedEmail)
  if (existingUser?.id) {
    return existingUser
  }

  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
  })

  if (error && !String(error.message || '').toLowerCase().includes('already registered')) {
    throw new Error(error.message || 'Unable to prepare verification email.')
  }

  if (data?.user?.id) {
    return data.user
  }

  return findAuthUserByEmail(normalizedEmail)
}
