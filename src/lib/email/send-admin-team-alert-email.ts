import { renderAdminTeamAlertEmail } from '@/emails/templates/admin-team-alert'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { safeText } from '@/lib/email/utils'

type AdminTeamAlertInput = {
  to: string
  heading: string
  subheading: string
  previewText: string
  accentLabel?: string
  summaryRows?: Array<{ label: string; value: string }>
  bodyTitle?: string
  bodyText?: string
  actionLabel?: string
  actionUrl?: string
}

export const sendAdminTeamAlertEmail = async ({
  to,
  heading,
  subheading,
  previewText,
  accentLabel,
  summaryRows,
  bodyTitle,
  bodyText,
  actionLabel,
  actionUrl,
}: AdminTeamAlertInput) => {
  const email = renderAdminTeamAlertEmail({
    heading: safeText(heading),
    subheading: safeText(subheading),
    previewText: safeText(previewText),
    accentLabel: safeText(accentLabel),
    summaryRows: Array.isArray(summaryRows) ? summaryRows : [],
    bodyTitle: safeText(bodyTitle),
    bodyText: safeText(bodyText),
    actionLabel: safeText(actionLabel),
    actionUrl: safeText(actionUrl),
  })

  await sendTransactionalEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
