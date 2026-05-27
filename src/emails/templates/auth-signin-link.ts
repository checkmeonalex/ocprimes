import { renderAuthActionEmail } from '@/emails/templates/auth-action'
import { safeText } from '@/lib/email/utils'

export const renderSigninLinkEmail = ({
  customerName,
  signinUrl,
}: {
  customerName?: string
  signinUrl: string
}) =>
  renderAuthActionEmail({
    subject: 'Verify your sign in to Alxora',
    previewText: 'Use this secure link to complete your sign in.',
    eyebrow: 'Sign In Verification',
    heading: 'Verify your sign in',
    subheading: 'Open this secure link to continue signing in to your Alxora account.',
    greetingName: safeText(customerName) || 'there',
    introText: 'For your security, we need to confirm this sign in before you continue.',
    ctaLabel: 'Continue to Alxora',
    ctaUrl: signinUrl,
    secondaryCtaLabel: 'Help',
    secondaryCtaUrl: 'https://alxora.com/help-center',
    bodyTitle: 'Why you got this email',
    bodyText: 'This sign-in link was requested from your account. If this was not you, you can ignore it.',
  })
