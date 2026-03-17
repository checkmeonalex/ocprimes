import { renderAuthActionEmail } from '@/emails/templates/auth-action'
import { safeText } from '@/lib/email/utils'

export const renderVendorVerificationEmail = ({
  email,
  verificationCode,
}: {
  email: string
  verificationCode: string
}) =>
  renderAuthActionEmail({
    subject: 'Verify your seller email on Alxora',
    previewText: 'Use this code to continue your seller setup on Alxora.',
    eyebrow: 'Seller Access',
    heading: 'Verify your seller email',
    subheading: 'Enter this verification code in your seller setup flow to continue.',
    greetingName: safeText(email),
    introText: 'We’re confirming that this email belongs to you before seller access is unlocked.',
    codeLabel: 'Verification code',
    codeValue: verificationCode,
    bodyTitle: 'Important',
    bodyText: 'This code expires soon. If you did not request seller access, you can ignore this email.',
  })
