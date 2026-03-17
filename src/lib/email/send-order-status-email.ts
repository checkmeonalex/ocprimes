import { renderOrderStatusEmail } from '@/emails/templates/order-status'
import { getCustomerOrderStatusLabel, getCustomerOrderStatusMessage } from '@/lib/orders/customer-status'
import { getEmailConfig } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { buildAbsoluteUrl, safeText } from '@/lib/email/utils'

type SendOrderStatusEmailInput = {
  to: string
  customerName: string
  orderId: string
  orderNumberLabel: string
  status: string
}

export const sendOrderStatusEmail = async ({
  to,
  customerName,
  orderId,
  orderNumberLabel,
  status,
}: SendOrderStatusEmailInput) => {
  const config = getEmailConfig()
  const orderUrl = buildAbsoluteUrl(config.appBaseUrl, `/UserBackend/orders/${encodeURIComponent(orderId)}`)
  const statusLabel = getCustomerOrderStatusLabel(status)
  const statusMessage = getCustomerOrderStatusMessage(status)
  const email = renderOrderStatusEmail({
    customerName: safeText(customerName) || 'there',
    orderNumberLabel,
    statusLabel,
    statusMessage,
    orderUrl,
  })

  await sendTransactionalEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
