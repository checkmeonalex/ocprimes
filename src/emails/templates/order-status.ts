import { renderEmailLayout } from '@/emails/templates/layout'
import { formatEmailMoney, type EmailOrderBreakdown } from '@/lib/email/order-breakdown'
import { escapeHtml } from '@/lib/email/utils'

type OrderStatusEmailInput = {
  customerName: string
  orderNumberLabel: string
  status: string
  statusLabel: string
  statusMessage: string
  orderUrl: string
  breakdown?: EmailOrderBreakdown
}

const normalizeStatusKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const truncateItemTitle = (value: string, maxLength = 42) => {
  const text = String(value || '').trim()
  if (!text || text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 4)).trimEnd()}....`
}

const ORDER_ACTIVITY_STEPS = [
  { title: 'Order accepted', note: 'Completed.' },
  { title: 'Order packed', note: 'Completed.' },
  { title: 'Ready for shipment', note: 'Completed.' },
  { title: 'Order enroute for delivery', note: 'Completed.' },
  { title: 'Order delivered', note: 'Your order was delivered successfully.' },
]

const getCompletedStepCount = (statusKey: string) => {
  if (statusKey === 'pending' || statusKey === 'paid') return 1
  if (statusKey === 'processing') return 2
  if (statusKey === 'ready_to_ship') return 3
  if (statusKey === 'out_for_delivery') return 4
  if (statusKey === 'delivered' || statusKey === 'completed') return 5
  return 0
}

const getCommerceOrderCopy = (status: string, statusLabel: string) => {
  const key = normalizeStatusKey(status)

  if (key === 'pending' || key === 'paid') {
    return {
      heading: 'Your order has been received',
      subheading:
        "Thanks for shopping with Alxora. We've received your payment and your order is now being prepared.",
      nextSteps:
        "We're confirming your items and getting them ready for shipment. You'll receive another update when your order is on the way.",
    }
  }

  if (key === 'processing') {
    return {
      heading: 'Your order is being prepared',
      subheading:
        'Good news. Your order is now being picked and packed for shipment.',
      nextSteps:
        "We're getting everything ready for delivery. We'll send you another update when your order is on the way.",
    }
  }

  if (key === 'ready_to_ship') {
    return {
      heading: 'Your order is ready to ship',
      subheading: 'Your order is packed and ready to move.',
      nextSteps:
        "Your package is waiting for handoff to delivery. We'll let you know as soon as it is on the way.",
    }
  }

  if (key === 'out_for_delivery') {
    return {
      heading: 'Your order is on the way',
      subheading: 'Your package is currently on its way to you.',
      nextSteps:
        'You can keep an eye on your order page for the latest delivery update.',
    }
  }

  if (key === 'delivered' || key === 'completed') {
    return {
      heading: 'Your order has been delivered',
      subheading:
        'Your order has arrived. We hope you love everything inside.',
      nextSteps:
        'You can view your order details anytime, and if you need help after delivery, support is available in your account.',
    }
  }

  if (key === 'cancelled') {
    return {
      heading: 'Your order has been cancelled',
      subheading:
        'This order has been cancelled and will not move forward for shipment.',
      nextSteps:
        'If this was unexpected, open your order page to review the details or contact support.',
    }
  }

  if (key === 'failed' || key === 'payment_failed' || key === 'awaiting_payment') {
    return {
      heading: `Your order is ${statusLabel.toLowerCase()}`,
      subheading:
        'We could not complete this order yet. Please review the order details to continue.',
      nextSteps:
        'Open your order page to see what needs attention. Once payment is confirmed, we will continue with your order.',
    }
  }

  return {
    heading: `Your order is now ${statusLabel}`,
    subheading: 'Here is your latest order update from Alxora.',
    nextSteps:
      'Open your order page to follow the latest progress. We will keep you updated as your order moves forward.',
  }
}

const renderOrderActivityHtml = (statusKey: string) => {
  const completedCount = getCompletedStepCount(statusKey)

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${ORDER_ACTIVITY_STEPS.map((step, index) => {
        const isDone = index < completedCount
        const isLast = index === ORDER_ACTIVITY_STEPS.length - 1
        return `
          <tr>
            <td width="26" valign="top" style="padding:0;">
              <table role="presentation" width="26" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-top:2px;">
                    <div style="width:12px;height:12px;background:${isDone ? '#2563eb' : '#d1d5db'};"></div>
                  </td>
                </tr>
                ${
                  !isLast
                    ? `<tr>
                        <td align="center">
                          <div style="width:2px;height:34px;background:${isDone ? '#2563eb' : '#d1d5db'};"></div>
                        </td>
                      </tr>`
                    : ''
                }
              </table>
            </td>
            <td valign="top" style="padding:0 0 12px 10px;">
              <div style="font-size:15px;font-weight:700;color:${isDone ? '#111827' : '#6b7280'};">${escapeHtml(step.title)}</div>
              <div style="font-size:14px;line-height:1.6;color:${isDone ? '#475569' : '#9ca3af'};">${escapeHtml(isDone ? step.note : 'Pending.')}</div>
            </td>
          </tr>
        `
      }).join('')}
    </table>
  `
}

export const renderOrderStatusEmail = ({
  orderNumberLabel,
  status,
  statusLabel,
  statusMessage,
  orderUrl,
  breakdown,
}: OrderStatusEmailInput) => {
  const statusKey = normalizeStatusKey(status)
  const commerceCopy = getCommerceOrderCopy(status, statusLabel)
  const displayStatusLabel = statusKey === 'pending' ? 'Order confirmed' : statusLabel
  const orderActivityHtml = renderOrderActivityHtml(statusKey)

  const summaryHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">Order number</div>
          <div style="font-size:20px;font-weight:800;color:#111827;">${escapeHtml(orderNumberLabel)}</div>
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">Status</div>
          <div style="display:inline-block;padding:10px 14px;background:#f7f2e4;border:1px solid #e4d5a5;font-size:13px;font-weight:800;color:#8b6b16;">
            ${escapeHtml(displayStatusLabel)}
          </div>
        </td>
      </tr>
    </table>
  `

  const breakdownHtml =
    breakdown && Array.isArray(breakdown.items) && breakdown.items.length > 0
      ? `
        <div style="margin:0 0 22px;background:#fff;border:1px solid #e7e1d4;">
          <div style="padding:16px 18px 12px;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;border-bottom:1px solid #e7e1d4;">Order breakdown</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:10px 18px;font-size:12px;font-weight:800;color:#6b7280;border-bottom:1px solid #f0ebe0;">Item</td>
              <td style="padding:10px 18px;font-size:12px;font-weight:800;color:#6b7280;border-bottom:1px solid #f0ebe0;" align="center">Quantity</td>
              <td style="padding:10px 18px;font-size:12px;font-weight:800;color:#6b7280;border-bottom:1px solid #f0ebe0;" align="right">Price</td>
            </tr>
            ${breakdown.items
              .map(
                (item) => `
                  <tr>
                    <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          ${
                            item.image
                              ? `<td valign="top" style="padding-right:12px;">
                                  <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="54" height="54" style="display:block;width:54px;height:54px;object-fit:cover;border:1px solid #ebe5d8;" />
                                </td>`
                              : ''
                          }
                          <td valign="top" style="font-size:15px;line-height:1.6;color:#334155;">
                            ${escapeHtml(truncateItemTitle(item.name))}
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:14px 18px;font-size:15px;color:#334155;border-bottom:1px solid #f0ebe0;" align="center">${Math.max(1, Number(item.quantity || 1))}</td>
                    <td style="padding:14px 18px;font-size:15px;font-weight:700;color:#111827;border-bottom:1px solid #f0ebe0;" align="right">${escapeHtml(
                      formatEmailMoney(Number(item.lineTotal || 0), breakdown.currency),
                    )}</td>
                  </tr>`,
              )
              .join('')}
            <tr>
              <td colspan="2" style="padding:10px 18px;font-size:14px;font-weight:700;color:#374151;border-bottom:1px solid #f0ebe0;">Delivery fees</td>
              <td style="padding:10px 18px;font-size:14px;color:#111827;border-bottom:1px solid #f0ebe0;" align="right">${escapeHtml(formatEmailMoney(Number(breakdown.shippingFee || 0), breakdown.currency))}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:10px 18px;font-size:14px;font-weight:700;color:#374151;border-bottom:1px solid #f0ebe0;">Discount</td>
              <td style="padding:10px 18px;font-size:14px;color:#111827;border-bottom:1px solid #f0ebe0;" align="right">${escapeHtml(formatEmailMoney(Number(breakdown.discountAmount || 0), breakdown.currency))}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:10px 18px;font-size:15px;font-weight:800;color:#111827;">Total</td>
              <td style="padding:10px 18px;font-size:15px;font-weight:800;color:#111827;" align="right">${escapeHtml(formatEmailMoney(Number(breakdown.totalAmount || 0), breakdown.currency))}</td>
            </tr>
            ${
              breakdown.paymentMethodLabel
                ? `<tr>
                    <td colspan="2" style="padding:10px 18px 16px;font-size:14px;font-weight:700;color:#374151;">Payment method</td>
                    <td style="padding:10px 18px 16px;font-size:14px;color:#111827;" align="right">${escapeHtml(breakdown.paymentMethodLabel)}</td>
                  </tr>`
                : ''
            }
          </table>
        </div>`
      : ''

  const bodyHtml = `
    <div style="margin:0 0 22px;padding:20px 22px;background:#fff8e7;border:1px solid #ead9a9;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">What happens next</div>
      <div style="font-size:15px;line-height:1.8;color:#334155;">${escapeHtml(commerceCopy.nextSteps)}</div>
    </div>
    <div style="margin:0 0 22px;padding:18px 20px;background:#fff;border:1px solid #e7e1d4;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:10px;">Order update</div>
      <div style="font-size:15px;line-height:1.8;color:#475569;">${escapeHtml(statusMessage)}</div>
    </div>
    ${breakdownHtml}
    <div style="padding:18px 20px;background:#fff;border:1px solid #e7e1d4;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:14px;">Order activity</div>
      ${orderActivityHtml}
    </div>
  `

  const text = [
    commerceCopy.heading,
    commerceCopy.subheading,
    `Order number: ${orderNumberLabel}`,
    `Status: ${displayStatusLabel}`,
    statusMessage,
    `Track your order: ${orderUrl}`,
  ].join('\n\n')

  return {
    subject: `Your Alxora order ${orderNumberLabel} is now ${statusLabel}`,
    html: renderEmailLayout({
      previewText: commerceCopy.subheading,
      eyebrow: 'Order Update',
      heading: commerceCopy.heading,
      subheading: commerceCopy.subheading,
      summaryHtml,
      accentLabel: 'Order Details',
      bodyHtml,
      ctaLabel: 'Track your order',
      ctaUrl: orderUrl,
      secondaryCtaLabel: 'View details',
      secondaryCtaUrl: orderUrl,
    }),
    text,
  }
}
