import { renderAuthActionEmail } from '@/emails/templates/auth-action'
import { safeText } from '@/lib/email/utils'

export const renderEmailChangeVerificationEmail = ({
  customerName,
  currentEmail,
  newEmail,
  verificationUrl,
}: {
  customerName?: string
  currentEmail: string
  newEmail: string
  verificationUrl: string
}) =>
  renderAuthActionEmail({
    subject: 'Confirm your email change on Alxora',
    previewText: 'Confirm this secure request to start updating your email address.',
    eyebrow: 'Account Security',
    heading: 'Confirm your email change',
    subheading: 'Review this request and confirm it from your current email before we update your account.',
    greetingName: safeText(customerName) || 'there',
    introText: 'We received a request to change the email address on your Alxora account.',
    summaryRows: [
      { label: 'Current email', value: safeText(currentEmail) },
      { label: 'New email', value: safeText(newEmail) },
    ],
    ctaLabel: 'Confirm change',
    ctaUrl: verificationUrl,
    secondaryCtaLabel: 'Account security',
    secondaryCtaUrl: 'https://alxora.com/account/security',
    bodyTitle: 'Next step',
    bodyText: 'After this confirmation, we will start the change and ask you to confirm the new email too.',
  })
