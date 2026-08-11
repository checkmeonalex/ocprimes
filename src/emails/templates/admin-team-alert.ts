import { emailHeroIcons, renderEmailLayout } from '@/emails/templates/layout'
import { escapeHtml } from '@/lib/email/utils'

type AdminTeamAlertEmailInput = {
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

export const renderAdminTeamAlertEmail = ({
  heading,
  subheading,
  previewText,
  accentLabel = 'Alert details',
  summaryRows = [],
  bodyTitle = 'What happened',
  bodyText = '',
  actionLabel,
  actionUrl,
}: AdminTeamAlertEmailInput) => {
  const summaryHtml =
    summaryRows.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${summaryRows
            .map(
              (row) => `<tr>
                <td style="padding:0 16px 10px 0;vertical-align:top;">
                  <div style="font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#f5c451;margin-bottom:6px;">${escapeHtml(row.label)}</div>
                  <div style="font-size:15px;font-weight:700;color:#ffffff;">${escapeHtml(row.value)}</div>
                </td>
              </tr>`,
            )
            .join('')}
        </table>`
      : ''

  const bodyHtml = `
    <div style="padding:18px 20px;background:#fff2cc;border-radius:14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#9a7a23;margin-bottom:10px;">${escapeHtml(bodyTitle)}</div>
      <div style="font-size:15px;line-height:1.8;color:#3a3126;">${escapeHtml(bodyText)}</div>
    </div>
  `

  return {
    subject: heading,
    html: renderEmailLayout({
      previewText,
      eyebrow: 'Admin alert',
      heading,
      subheading,
      heroIconSvg: emailHeroIcons.megaphone,
      summaryHtml,
      accentLabel,
      bodyHtml,
      ctaLabel: actionLabel,
      ctaUrl: actionUrl,
    }),
    text: [heading, subheading, bodyText, actionUrl ? `${actionLabel || 'Open'}: ${actionUrl}` : '']
      .filter(Boolean)
      .join('\n\n'),
  }
}
