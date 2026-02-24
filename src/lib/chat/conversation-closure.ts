import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getNowIso, getNowMs } from '@/lib/time/virtual-now'

const DAY_MS = 24 * 60 * 60 * 1000
const PARTICIPANT_VISIBILITY_DAYS = 7
const ADMIN_RETENTION_DAYS = 14
const INACTIVITY_CLOSE_DAYS = 7

const toIsoString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const toDateMs = (value: unknown) => {
  const iso = toIsoString(value)
  if (!iso) return null
  const parsed = new Date(iso).getTime()
  if (Number.isNaN(parsed)) return null
  return parsed
}

const buildIso = (ms: number | null) => {
  if (ms == null || Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

export const getConversationClosureState = ({
  conversation,
  isAdmin,
  nowMs = getNowMs(),
}: {
  conversation: any
  isAdmin: boolean
  nowMs?: number
}) => {
  const closedAt = toIsoString(conversation?.closed_at || conversation?.closedAt)
  const closedReason = toIsoString(conversation?.closed_reason || conversation?.closedReason)
  const closedAtMs = toDateMs(closedAt)
  if (!closedAt || closedAtMs == null) {
    return {
      isClosed: false,
      canView: true,
      canSend: true,
      closedAt: null,
      participantVisibleUntil: null,
      adminRetentionUntil: null,
      participantNotice: '',
    }
  }

  const participantVisibleUntilMs = closedAtMs + PARTICIPANT_VISIBILITY_DAYS * DAY_MS
  const adminRetentionUntilMs = closedAtMs + ADMIN_RETENTION_DAYS * DAY_MS
  const canAdminView = nowMs < adminRetentionUntilMs
  const canParticipantView = nowMs < participantVisibleUntilMs
  const remainingDays = Math.max(
    0,
    Math.ceil((participantVisibleUntilMs - nowMs) / DAY_MS),
  )

  return {
    isClosed: true,
    canView: isAdmin ? canAdminView : canParticipantView,
    canSend: isAdmin ? canAdminView : false,
    closedAt,
    participantVisibleUntil: buildIso(participantVisibleUntilMs),
    adminRetentionUntil: buildIso(adminRetentionUntilMs),
    closedReason,
    participantNotice: canParticipantView
      ? `${
          closedReason === 'product_unavailable'
            ? 'This chat was closed because this product is unavailable'
            : closedReason === 'inactive'
              ? 'This chat was closed due to inactivity'
              : 'This chat is closed'
        } and will disappear in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`
      : 'This chat has been closed.',
  }
}

export const closeConversation = async ({
  conversationId,
  closedByUserId,
  closedReason = 'ended_by_user',
}: {
  conversationId: string
  closedByUserId: string
  closedReason?: string
}) => {
  const adminDb = createAdminSupabaseClient()
  const nowIso = getNowIso()
  const { data, error } = await adminDb
    .from('chat_conversations')
    .update({
      closed_at: nowIso,
      closed_by_user_id: closedByUserId,
      closed_reason: closedReason,
      updated_at: nowIso,
    })
    .eq('id', conversationId)
    .is('closed_at', null)
    .select('id, closed_at, closed_by_user_id, closed_reason')
    .maybeSingle()

  return { data, error }
}

const getRoleCache = () => new Map<string, boolean>()

const isAdminUserId = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  roleCache: Map<string, boolean>,
) => {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return false
  if (roleCache.has(safeUserId)) return Boolean(roleCache.get(safeUserId))

  const [rolesRes, profileRes] = await Promise.all([
    adminDb
      .from('user_roles')
      .select('role')
      .eq('user_id', safeUserId)
      .eq('role', 'admin')
      .limit(1),
    adminDb
      .from('profiles')
      .select('role')
      .eq('id', safeUserId)
      .eq('role', 'admin')
      .maybeSingle(),
  ])

  const isAdmin =
    (Array.isArray(rolesRes.data) && rolesRes.data.length > 0) ||
    String(profileRes.data?.role || '').trim().toLowerCase() === 'admin'
  roleCache.set(safeUserId, isAdmin)
  return isAdmin
}

const isSupportConversation = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  conversation: any,
  roleCache: Map<string, boolean>,
) => {
  const customerUserId = String(
    conversation?.customer_user_id || conversation?.customerUserId || '',
  ).trim()
  const vendorUserId = String(
    conversation?.vendor_user_id || conversation?.vendorUserId || '',
  ).trim()
  if (!customerUserId && !vendorUserId) return false

  const [customerIsAdmin, vendorIsAdmin] = await Promise.all([
    isAdminUserId(adminDb, customerUserId, roleCache),
    isAdminUserId(adminDb, vendorUserId, roleCache),
  ])
  return customerIsAdmin || vendorIsAdmin
}

export const isSupportConversationRecord = async (conversation: any) => {
  const adminDb = createAdminSupabaseClient()
  const roleCache = getRoleCache()
  return isSupportConversation(adminDb, conversation, roleCache)
}

const isProductUnavailable = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  productId: string,
  productCache?: Map<string, boolean>,
) => {
  const safeProductId = String(productId || '').trim()
  if (!safeProductId) return true
  if (productCache?.has(safeProductId)) {
    return Boolean(productCache.get(safeProductId))
  }
  const { data, error } = await adminDb
    .from('products')
    .select('id, status, stock_quantity')
    .eq('id', safeProductId)
    .maybeSingle()

  if (error || !data?.id) return true

  const status = String(data.status || '').trim().toLowerCase()
  const stockQuantity = Number(data.stock_quantity || 0)
  const unavailable = status !== 'publish' || !Number.isFinite(stockQuantity) || stockQuantity <= 0
  if (productCache) {
    productCache.set(safeProductId, unavailable)
  }
  return unavailable
}

const getConversationActivityMs = (conversation: any) => {
  let latest: number | null = null
  const values = [
    conversation?.last_message_at,
    conversation?.lastMessageAt,
    conversation?.updated_at,
    conversation?.updatedAt,
    conversation?.created_at,
    conversation?.createdAt,
  ]
  for (const value of values) {
    const ms = toDateMs(value)
    if (ms == null) continue
    if (latest == null || ms > latest) latest = ms
  }
  return latest
}

export const maybeAutoCloseConversation = async (conversation: any) => {
  const nowMs = getNowMs()
  const closedAtMs = toDateMs(conversation?.closed_at || conversation?.closedAt)
  if (closedAtMs != null) {
    return { data: conversation, error: null, changed: false }
  }

  const adminDb = createAdminSupabaseClient()
  const roleCache = getRoleCache()
  const supportConversation = await isSupportConversation(adminDb, conversation, roleCache)
  if (supportConversation) {
    return { data: conversation, error: null, changed: false }
  }

  const productId = String(conversation?.product_id || conversation?.productId || '').trim()
  const unavailable = await isProductUnavailable(adminDb, productId)
  if (unavailable) {
    const conversationId = String(conversation?.id || '').trim()
    const closedByUserId = String(conversation?.closed_by_user_id || conversation?.vendor_user_id || '').trim()
    const closeResult = await closeConversation({
      conversationId,
      closedByUserId,
      closedReason: 'product_unavailable',
    })
    return { data: closeResult.data || conversation, error: closeResult.error, changed: true }
  }

  const activityMs = getConversationActivityMs(conversation)
  if (activityMs != null && nowMs - activityMs >= INACTIVITY_CLOSE_DAYS * DAY_MS) {
    const conversationId = String(conversation?.id || '').trim()
    const closedByUserId = String(conversation?.closed_by_user_id || conversation?.vendor_user_id || '').trim()
    const closeResult = await closeConversation({
      conversationId,
      closedByUserId,
      closedReason: 'inactive',
    })
    return { data: closeResult.data || conversation, error: closeResult.error, changed: true }
  }

  return { data: conversation, error: null, changed: false }
}

const autoCloseEligibleConversations = async () => {
  const adminDb = createAdminSupabaseClient()
  const nowMs = getNowMs()
  const roleCache = getRoleCache()
  const productCache = new Map<string, boolean>()

  const unavailableProductsRes = await adminDb
    .from('products')
    .select('id')
    .or('status.neq.publish,stock_quantity.lte.0')
    .limit(500)

  if (Array.isArray(unavailableProductsRes.data) && unavailableProductsRes.data.length > 0) {
    const unavailableProductIds = unavailableProductsRes.data
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean)

    if (unavailableProductIds.length > 0) {
      const unavailableConversationRes = await adminDb
        .from('chat_conversations')
        .select('id, customer_user_id, vendor_user_id, product_id, closed_at')
        .is('closed_at', null)
        .in('product_id', unavailableProductIds)
        .limit(500)

      if (Array.isArray(unavailableConversationRes.data)) {
        for (const row of unavailableConversationRes.data) {
          const supportConversation = await isSupportConversation(adminDb, row, roleCache)
          if (supportConversation) continue
          const conversationId = String((row as any)?.id || '').trim()
          const closerUserId = String((row as any)?.vendor_user_id || '').trim()
          if (!conversationId || !closerUserId) continue
          await closeConversation({
            conversationId,
            closedByUserId: closerUserId,
            closedReason: 'product_unavailable',
          })
        }
      }
    }
  }

  const cutoffIso = new Date(nowMs - INACTIVITY_CLOSE_DAYS * DAY_MS).toISOString()
  const { data, error } = await adminDb
    .from('chat_conversations')
    .select(
      'id, customer_user_id, vendor_user_id, product_id, created_at, updated_at, last_message_at, closed_at',
    )
    .is('closed_at', null)
    .or(`last_message_at.lt.${cutoffIso},updated_at.lt.${cutoffIso}`)
    .order('updated_at', { ascending: true })
    .limit(300)

  if (error || !Array.isArray(data) || !data.length) return { error }

  for (const row of data) {
    const supportConversation = await isSupportConversation(adminDb, row, roleCache)
    if (supportConversation) continue

    const conversationId = String((row as any)?.id || '').trim()
    const closerUserId = String((row as any)?.vendor_user_id || '').trim()
    if (!conversationId || !closerUserId) continue

    const unavailable = await isProductUnavailable(
      adminDb,
      String((row as any)?.product_id || '').trim(),
      productCache,
    )
    if (unavailable) {
      await closeConversation({
        conversationId,
        closedByUserId: closerUserId,
        closedReason: 'product_unavailable',
      })
      continue
    }

    const activityMs = getConversationActivityMs(row)
    if (activityMs != null && nowMs - activityMs >= INACTIVITY_CLOSE_DAYS * DAY_MS) {
      await closeConversation({
        conversationId,
        closedByUserId: closerUserId,
        closedReason: 'inactive',
      })
    }
  }

  return { error: null }
}

export const reopenConversation = async ({
  conversationId,
}: {
  conversationId: string
}) => {
  const adminDb = createAdminSupabaseClient()
  const nowIso = getNowIso()
  const { data, error } = await adminDb
    .from('chat_conversations')
    .update({
      closed_at: null,
      closed_by_user_id: null,
      closed_reason: null,
      updated_at: nowIso,
    })
    .eq('id', conversationId)
    .not('closed_at', 'is', null)
    .select('id, closed_at, closed_by_user_id, closed_reason')
    .maybeSingle()

  return { data, error }
}

export const clearConversation = async ({
  conversationId,
}: {
  conversationId: string
}) => {
  const adminDb = createAdminSupabaseClient()
  const safeConversationId = String(conversationId || '').trim()
  if (!safeConversationId) {
    return { data: null, error: new Error('Missing conversation id.') }
  }

  const deleteMessagesResult = await adminDb
    .from('chat_messages')
    .delete()
    .eq('conversation_id', safeConversationId)
  if (deleteMessagesResult.error) {
    return { data: null, error: deleteMessagesResult.error }
  }

  const deleteConversationResult = await adminDb
    .from('chat_conversations')
    .delete()
    .eq('id', safeConversationId)
    .select('id')
    .maybeSingle()

  return { data: deleteConversationResult.data, error: deleteConversationResult.error }
}

export const purgeExpiredClosedConversations = async () => {
  await autoCloseEligibleConversations()

  const adminDb = createAdminSupabaseClient()
  const cutoffIso = new Date(getNowMs() - ADMIN_RETENTION_DAYS * DAY_MS).toISOString()
  const { data, error: listError } = await adminDb
    .from('chat_conversations')
    .select('id, customer_user_id, vendor_user_id')
    .not('closed_at', 'is', null)
    .lt('closed_at', cutoffIso)
    .limit(500)

  if (listError || !Array.isArray(data) || !data.length) {
    return { error: listError }
  }

  const roleCache = getRoleCache()
  const deletableIds: string[] = []
  for (const row of data) {
    const supportConversation = await isSupportConversation(adminDb, row, roleCache)
    if (supportConversation) continue
    const conversationId = String((row as any)?.id || '').trim()
    if (conversationId) deletableIds.push(conversationId)
  }

  if (!deletableIds.length) return { error: null }

  const { error } = await adminDb
    .from('chat_conversations')
    .delete()
    .in('id', deletableIds)

  return { error }
}
