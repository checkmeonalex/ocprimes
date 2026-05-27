import { renderAuthActionEmail } from '@/emails/templates/auth-action'
import { safeText } from '@/lib/email/utils'

export const renderVendorApprovalEmail = ({
  fullName,
  brandName,
  setupUrl,
}: {
  fullName?: string
  brandName?: string
  setupUrl: string
}) =>
  renderAuthActionEmail({
    subject: 'Your seller access is ready on Alxora',
    previewText: 'Your seller request was approved. Set your password to continue.',
    eyebrow: 'Seller Access',
    heading: 'Your seller access is ready',
    subheading: 'Your request was approved. Set your password to activate your dashboard access.',
    greetingName: safeText(fullName) || 'there',
    introText: brandName
      ? `Good news. ${safeText(brandName)} is now approved to sell on Alxora.`
      : 'Good news. Your seller request was approved on Alxora.',
    ctaLabel: 'Set your password',
    ctaUrl: setupUrl,
    secondaryCtaLabel: 'Seller login',
    secondaryCtaUrl: 'https://alxora.com/vendor/login',
    bodyTitle: 'What happens next',
    bodyText: 'Create your password, sign in, and complete your seller setup from your dashboard.',
  })

export const renderVendorRejectionEmail = ({
  fullName,
  brandName,
  reviewNote,
}: {
  fullName?: string
  brandName?: string
  reviewNote?: string
}) =>
  renderAuthActionEmail({
    subject: 'Your seller request was reviewed on Alxora',
    previewText: 'Your seller request was reviewed. Open the details below.',
    eyebrow: 'Seller Access',
    heading: 'Your seller request was reviewed',
    subheading: 'We reviewed your seller request and could not approve it at this time.',
    greetingName: safeText(fullName) || 'there',
    introText: brandName
      ? `${safeText(brandName)} could not be approved for seller access right now.`
      : 'Your seller request could not be approved right now.',
    bodyTitle: 'Review note',
    bodyText:
      safeText(reviewNote) ||
      'Please review your details and submit another request when everything is ready.',
    ctaLabel: 'Seller help',
    ctaUrl: 'https://alxora.com/help-center',
    secondaryCtaLabel: 'Try again later',
    secondaryCtaUrl: 'https://alxora.com/sellersignup',
  })
