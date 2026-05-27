import { renderEmailLayout } from '@/emails/templates/layout'
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
                  <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:6px;">${escapeHtml(row.label)}</div>
                  <div style="font-size:15px;font-weight:700;color:#111827;">${escapeHtml(row.value)}</div>
                </td>
              </tr>`,
            )
            .join('')}
        </table>`
      : ''

  const bodyHtml = `
    <div style="padding:18px 20px;background:#fff8e7;border:1px solid #ead9a9;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">${escapeHtml(bodyTitle)}</div>
      <div style="font-size:15px;line-height:1.8;color:#475569;">${escapeHtml(bodyText)}</div>
    </div>
  `

  return {
    subject: heading,
    html: renderEmailLayout({
      previewText,
      eyebrow: 'Admin alert',
      heading,
      subheading,
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
