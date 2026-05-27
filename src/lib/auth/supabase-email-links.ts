import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'

const safeText = (value: unknown) => String(value || '').trim()

const readGeneratedLinkProperties = (data: any) => {
  const properties = data?.properties || {}
  const actionLink = safeText(properties.action_link)
  const emailOtp = safeText(properties.email_otp)

  if (!actionLink) {
    throw new Error('Unable to generate secure email link.')
  }

  return {
    actionLink,
    emailOtp,
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

  return readGeneratedLinkProperties(data)
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
