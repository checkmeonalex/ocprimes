export const ADMIN_NOTIFICATIONS_TABLE = 'admin_notifications'
const ADMIN_NOTIFICATION_LIMIT = 100
const VENDOR_NOTIFICATION_LIMIT = 50
const CUSTOMER_NOTIFICATION_LIMIT = 100

type NotificationCreateInput = {
  recipient_user_id: string
  recipient_role: 'admin' | 'vendor' | 'customer'
  title: string
  message: string
  type?: string
  severity?: 'info' | 'success' | 'warning' | 'error'
  entity_type?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown>
  created_by?: string | null
}

export async function createNotifications(db: any, payloads: NotificationCreateInput[] = []) {
  if (!Array.isArray(payloads) || payloads.length === 0) return
  const normalized = payloads
    .map((item) => ({
      recipient_user_id: String(item?.recipient_user_id || ''),
      recipient_role:
        item?.recipient_role === 'vendor'
          ? 'vendor'
          : item?.recipient_role === 'customer'
            ? 'customer'
            : 'admin',
      title: String(item?.title || '').trim(),
      message: String(item?.message || '').trim(),
      type: String(item?.type || 'system').trim() || 'system',
      severity: item?.severity || 'info',
      entity_type: item?.entity_type ? String(item.entity_type) : null,
      entity_id: item?.entity_id ? String(item.entity_id) : null,
      metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : {},
      created_by: item?.created_by ? String(item.created_by) : null,
    }))
    .filter((item) => item.recipient_user_id && item.title && item.message)
  if (!normalized.length) return

  const { error } = await db.from(ADMIN_NOTIFICATIONS_TABLE).insert(normalized)
  if (error) {
    console.error('admin notifications insert failed:', error.message)
    return
  }

  const uniqueRecipients = Array.from(
    new Map(
      normalized.map((item) => [
        `${item.recipient_user_id}:${item.recipient_role}`,
        { userId: item.recipient_user_id, role: item.recipient_role },
      ]),
    ).values(),
  )

  for (const recipient of uniqueRecipients) {
    const maxKeep =
      recipient.role === 'admin'
        ? ADMIN_NOTIFICATION_LIMIT
        : recipient.role === 'vendor'
          ? VENDOR_NOTIFICATION_LIMIT
          : CUSTOMER_NOTIFICATION_LIMIT
    let hasMore = true
    while (hasMore) {
      const { data: overflowRows, error: overflowError } = await db
        .from(ADMIN_NOTIFICATIONS_TABLE)
        .select('id')
        .eq('recipient_user_id', recipient.userId)
        .eq('recipient_role', recipient.role)
        .order('created_at', { ascending: false })
        .range(maxKeep, maxKeep + 999)

      if (overflowError) {
        console.error('admin notifications retention lookup failed:', overflowError.message)
        break
      }

      const overflowIds = Array.isArray(overflowRows)
        ? overflowRows.map((row: { id?: string | null }) => String(row?.id || '')).filter(Boolean)
        : []

      if (!overflowIds.length) {
        hasMore = false
        break
      }

      const { error: deleteError } = await db
        .from(ADMIN_NOTIFICATIONS_TABLE)
        .delete()
        .in('id', overflowIds)
      if (deleteError) {
        console.error('admin notifications retention delete failed:', deleteError.message)
        break
      }
    }
  }
}

export async function notifyAllAdmins(
  db: any,
  {
    title,
    message,
    type = 'system',
    severity = 'info',
    entityType = null,
    entityId = null,
    metadata = {},
    createdBy = null,
  }: {
    title: string
    message: string
    type?: string
    severity?: 'info' | 'success' | 'warning' | 'error'
    entityType?: string | null
    entityId?: string | null
    metadata?: Record<string, unknown>
    createdBy?: string | null
  },
) {
  const { data, error } = await db.from('user_roles').select('user_id').eq('role', 'admin')
  if (error) {
    console.error('admin notifications admin recipients lookup failed:', error.message)
    return
  }
  const recipientIds = Array.from(
    new Set(
      (Array.isArray(data) ? data : [])
        .map((row: { user_id?: string | null }) => String(row?.user_id || '').trim())
        .filter(Boolean),
    ),
  )
  if (!recipientIds.length) return
  await createNotifications(
    db,
    recipientIds.map((recipientId) => ({
      recipient_user_id: recipientId,
      recipient_role: 'admin',
      title,
      message,
      type,
      severity,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_by: createdBy,
    })),
  )
}
