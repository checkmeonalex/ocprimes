import { generateMagicLinkEmailLink } from '@/lib/auth/supabase-email-links'
import { sendSigninLinkEmail } from '@/lib/email/send-auth-action-emails'

const safeText = (value: unknown) => String(value || '').trim()

export async function sendEmailOtpCode(
  email: string,
  options: {
    redirectTo?: string
    customerName?: string
  } = {},
) {
  const normalizedEmail = safeText(email).toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Email address is required.')
  }

  const generated = await generateMagicLinkEmailLink({
    email: normalizedEmail,
    redirectTo: safeText(options.redirectTo),
  })

  await sendSigninLinkEmail({
    to: normalizedEmail,
    customerName: safeText(options.customerName),
    signinUrl: generated.actionLink,
  })

  return generated
}
