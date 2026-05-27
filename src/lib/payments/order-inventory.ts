import { notifyAllAdmins } from '@/lib/admin/notifications'

type AdminDb = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: any; error: any }>
}

const normalizeIssues = (value: unknown) => {
  if (Array.isArray(value)) return value
  return []
}

export const deductConfirmedOrderInventory = async (
  adminDb: AdminDb,
  orderId: string,
  options: {
    orderNumber?: string
    userId?: string
  } = {},
) => {
  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return { alreadyDeducted: false, deductedAt: '', issues: [] as any[] }
  }

  const { data, error } = await adminDb.rpc('deduct_checkout_order_inventory', {
    target_order_id: safeOrderId,
  })
  if (error) {
    throw new Error(error.message || 'Unable to deduct inventory.')
  }

  const row = Array.isArray(data) ? data[0] : data
  const issues = normalizeIssues(row?.issues)
  const result = {
    alreadyDeducted: Boolean(row?.already_deducted),
    deductedAt: String(row?.deducted_at || '').trim(),
    issues,
  }

  if (issues.length > 0) {
    const orderNumber = String(options.orderNumber || '').trim() || `#${safeOrderId.replace(/-/g, '').toUpperCase()}`
    await notifyAllAdmins(adminDb as any, {
      title: `Inventory review needed ${orderNumber}`,
      message: 'Payment was confirmed, but one or more items could not be deducted from stock automatically.',
      type: 'inventory_review_required',
      severity: 'warning',
      entityType: 'order',
      entityId: safeOrderId,
      metadata: {
        order_id: safeOrderId,
        order_number: orderNumber,
        inventory_issues: issues,
        action_url: `/backend/admin/orders/${safeOrderId}`,
      },
      createdBy: String(options.userId || '').trim() || null,
    })
  }

  return result
}
