const STATUS_LABELS = {
  awaiting_payment: 'Awaiting Payment',
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  ready_to_ship: 'Ready to Ship',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  failed: 'Payment Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const STATUS_MESSAGES = {
  awaiting_payment: "We're waiting to receive your payment. Please complete payment to continue.",
  pending: "Payment received. We're confirming your order.",
  paid: 'Payment confirmed. Your order will move to processing shortly.',
  processing: 'Your order is being prepared for shipment.',
  ready_to_ship: 'Your order is packed and ready to ship.',
  out_for_delivery: 'Your order is on the way to your delivery address.',
  delivered: 'Your order has been delivered successfully.',
  completed: 'Your order has been completed successfully.',
  failed: 'Payment was not completed. Please try again.',
  cancelled: 'This order has been cancelled.',
  refunded: 'Your payment has been refunded.',
}

export const normalizeCustomerOrderStatusKey = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'payment_failed') return 'failed'
  if (normalized === 'canceled') return 'cancelled'
  return normalized
}

export const getCustomerOrderStatusLabel = (value) => {
  const key = normalizeCustomerOrderStatusKey(value)
  return STATUS_LABELS[key] || String(value || 'Status')
}

export const getCustomerOrderStatusMessage = (value) => {
  const key = normalizeCustomerOrderStatusKey(value)
  return STATUS_MESSAGES[key] || 'We are updating your order status.'
}
