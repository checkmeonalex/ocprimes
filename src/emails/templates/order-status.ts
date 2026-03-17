import { renderEmailLayout } from '@/emails/templates/layout'
import { escapeHtml } from '@/lib/email/utils'

type OrderStatusEmailInput = {
  customerName: string
  orderNumberLabel: string
  statusLabel: string
  statusMessage: string
  orderUrl: string
}

export const renderOrderStatusEmail = ({
  customerName,
  orderNumberLabel,
  statusLabel,
  statusMessage,
  orderUrl,
}: OrderStatusEmailInput) => {
  const summaryHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Order</div>
          <div style="font-size:20px;font-weight:800;color:#0f172a;">${escapeHtml(orderNumberLabel)}</div>
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Current status</div>
          <div style="display:inline-block;padding:10px 14px;border-radius:999px;background:rgba(225,208,131,0.16);border:1px solid rgba(150,109,16,0.18);font-size:13px;font-weight:800;color:#8b6b16;">
            ${escapeHtml(statusLabel)}
          </div>
        </td>
      </tr>
    </table>
  `

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:16px;">Hi ${escapeHtml(customerName || 'there')},</p>
    <p style="margin:0 0 18px;font-size:16px;">
      Your order <strong>${escapeHtml(orderNumberLabel)}</strong> is now
      <strong>${escapeHtml(statusLabel)}</strong>.
    </p>
    <div style="margin:0 0 22px;padding:20px 22px;border-radius:22px;background:linear-gradient(180deg,#fff7df 0%,#fff 100%);border:1px solid rgba(225,208,131,0.38);">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">What this means</div>
      <div style="font-size:15px;line-height:1.8;color:#334155;">${escapeHtml(statusMessage)}</div>
    </div>
    <div style="padding:18px 20px;border-radius:22px;background:#fff;border:1px solid rgba(148,163,184,0.16);">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Need help?</div>
      <div style="font-size:15px;line-height:1.8;color:#475569;">
        You can open your order timeline for delivery progress, order details, and support options anytime.
      </div>
    </div>
  `

  const text = [
    `Hi ${customerName || 'there'},`,
    `Your order ${orderNumberLabel} is now ${statusLabel}.`,
    statusMessage,
    `View order: ${orderUrl}`,
  ].join('\n\n')

  return {
    subject: `Your Alxora order ${orderNumberLabel} is now ${statusLabel}`,
    html: renderEmailLayout({
      previewText: `Your order ${orderNumberLabel} is now ${statusLabel}.`,
      headerNote: 'ALXORA ORDER DESK',
      eyebrow: 'Order Update',
      heading: `${orderNumberLabel} is now ${statusLabel}`,
      subheading:
        'We keep your delivery progress, order details, and support access in one place so you can check the next step quickly.',
      summaryHtml,
      accentLabel: 'Order Summary',
      bodyHtml,
      ctaLabel: 'View order',
      ctaUrl: orderUrl,
    }),
    text,
  }
}
