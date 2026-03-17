import { renderAuthActionEmail } from '@/emails/templates/auth-action'
import { safeText } from '@/lib/email/utils'

export const renderPasswordResetEmail = ({
  customerName,
  resetUrl,
}: {
  customerName?: string
  resetUrl: string
}) =>
  renderAuthActionEmail({
    subject: 'Reset your Alxora password',
    previewText: 'Use this secure link to reset your password.',
    eyebrow: 'Account Security',
    heading: 'Reset your password',
    subheading: 'Use the secure link below to choose a new password for your Alxora account.',
    greetingName: safeText(customerName) || 'there',
    introText: 'We received a request to reset your password. If this was you, continue below.',
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    secondaryCtaLabel: 'Help',
    secondaryCtaUrl: 'https://alxora.com/help-center',
    bodyTitle: 'Important',
    bodyText: 'If you did not request this, you can ignore this email. Your password will stay the same.',
  })
