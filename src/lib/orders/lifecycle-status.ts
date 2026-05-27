export type OrderLifecycleStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'payment_failed'
  | 'processing'
  | 'ready_to_ship'
  | 'out_for_delivery'
  | 'delivered'
  | 'refunded'
  | 'cancelled'

export const mergeOrderLifecycleStatus = (
  shippingAddress: unknown,
  status: OrderLifecycleStatus,
) => {
  const base =
    shippingAddress && typeof shippingAddress === 'object'
      ? { ...(shippingAddress as Record<string, unknown>) }
      : {}

  const timestamp = new Date().toISOString()

  return {
    ...base,
    orderStatus: status,
    order_status: status,
    status,
    statusUpdatedAt: timestamp,
    status_updated_at: timestamp,
  }
}
