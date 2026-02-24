import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getLastSeenLabel } from '@/lib/chat/presence'

const DASHBOARD_CONVERSATION_COLUMNS =
  'id, customer_user_id, vendor_user_id, product_id, created_at, updated_at, last_message_at, last_message_preview, admin_takeover_enabled, admin_takeover_by, admin_takeover_at'

const DASHBOARD_MESSAGE_COLUMNS =
  'id, conversation_id, sender_user_id, body, created_at'

const formatIso = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const safeText = (value: unknown, fallback = '') => String(value || fallback).trim()

const fallbackUserLabel = (userId: string) => {
  if (!userId) return 'Unknown user'
  return `User ${userId.slice(0, 8)}`
}

const toEmailAlias = (email: string) => {
  const normalized = safeText(email).toLowerCase()
  if (!normalized) return ''
  const [localPart] = normalized.split('@')
  if (localPart) return localPart
  return normalized.replace(/@/g, '')
}

export const loadUserIdentityMap = async (userIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)))
  const identityMap = new Map<string, { email: string; name: string; lastSignInAt: string | null }>()

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data, error } = await adminDb.auth.admin.getUserById(userId)
        if (error || !data?.user?.id) return
        const email = safeText(data.user.email)
        identityMap.set(String(data.user.id), {
          email,
          name: toEmailAlias(email),
          lastSignInAt: formatIso(data.user.last_sign_in_at),
        })
      } catch {
        // Ignore single-user lookup failures and keep fallback labels.
      }
    }),
  )

  return identityMap
}

const loadVendorStoreNameMap = async (vendorUserIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueVendorIds = Array.from(
    new Set(vendorUserIds.map((id) => String(id || '').trim()).filter(Boolean)),
  )
  if (!uniqueVendorIds.length) return new Map<string, string>()

  const { data, error } = await adminDb
    .from('admin_brands')
    .select('created_by, name, created_at')
    .in('created_by', uniqueVendorIds)
    .order('created_at', { ascending: true })

  if (error) return new Map<string, string>()

  const storeByVendorId = new Map<string, string>()
  ;(Array.isArray(data) ? data : []).forEach((row: any) => {
    const vendorUserId = safeText(row?.created_by)
    const storeName = safeText(row?.name)
    if (!vendorUserId || !storeName) return
    if (storeByVendorId.has(vendorUserId)) return
    storeByVendorId.set(vendorUserId, storeName)
  })

  return storeByVendorId
}

const loadVendorUnreadCountMap = async (
  conversations: Array<{ id: string; customerUserId: string }>,
) => {
  const adminDb = createAdminSupabaseClient()
  const conversationIds = conversations
    .map((row) => safeText(row.id))
    .filter(Boolean)

  if (!conversationIds.length) return new Map<string, number>()

  const customerByConversationId = new Map<string, string>()
  conversations.forEach((conversation) => {
    const conversationId = safeText(conversation.id)
    const customerUserId = safeText(conversation.customerUserId)
    if (!conversationId || !customerUserId) return
    customerByConversationId.set(conversationId, customerUserId)
  })

  const { data, error } = await adminDb
    .from('chat_messages')
    .select('conversation_id, sender_user_id')
    .in('conversation_id', conversationIds)
    .is('vendor_read_at', null)

  if (error || !Array.isArray(data)) return new Map<string, number>()

  const unreadCountByConversationId = new Map<string, number>()
  data.forEach((row: any) => {
    const conversationId = safeText(row?.conversation_id)
    const senderUserId = safeText(row?.sender_user_id)
    if (!conversationId || !senderUserId) return
    if (senderUserId !== customerByConversationId.get(conversationId)) return
    unreadCountByConversationId.set(
      conversationId,
      (unreadCountByConversationId.get(conversationId) || 0) + 1,
    )
  })

  return unreadCountByConversationId
}

export const listDashboardConversations = async () => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) {
    return { data: [], error }
  }

  const conversations = Array.isArray(data) ? data : []
  const identityMap = await loadUserIdentityMap(
    conversations.flatMap((row: any) => [
      String(row?.customer_user_id || ''),
      String(row?.vendor_user_id || ''),
    ]),
  )
  const vendorStoreMap = await loadVendorStoreNameMap(
    conversations.map((row: any) => String(row?.vendor_user_id || '')),
  )
  const unreadCountMap = await loadVendorUnreadCountMap(
    conversations.map((row: any) => ({
      id: safeText(row?.id),
      customerUserId: safeText(row?.customer_user_id),
    })),
  )

  const mapped = conversations.map((row: any) => {
    const customerUserId = safeText(row?.customer_user_id)
    const vendorUserId = safeText(row?.vendor_user_id)
    const customerIdentity = identityMap.get(customerUserId)
    const customerEmail = safeText(customerIdentity?.email)
    const customerAlias = toEmailAlias(customerEmail)
    const vendorStoreName = safeText(vendorStoreMap.get(vendorUserId))
    const customerPresence = getLastSeenLabel({
      lastActiveAt: customerIdentity?.lastSignInAt || null,
    })

    return {
      id: safeText(row?.id),
      customerUserId,
      vendorUserId,
      customerName:
        safeText(customerIdentity?.name) || customerAlias || fallbackUserLabel(customerUserId),
      vendorName: vendorStoreName || 'Seller',
      customerEmail,
      vendorEmail: safeText(identityMap.get(vendorUserId)?.email),
      productId: safeText(row?.product_id),
      adminTakeoverEnabled: Boolean(row?.admin_takeover_enabled),
      adminTakeoverBy: safeText(row?.admin_takeover_by),
      adminTakeoverAt: formatIso(row?.admin_takeover_at),
      createdAt: formatIso(row?.created_at),
      updatedAt: formatIso(row?.updated_at),
      lastMessageAt: formatIso(row?.last_message_at),
      lastMessagePreview: safeText(row?.last_message_preview),
      unreadCount: unreadCountMap.get(safeText(row?.id)) || 0,
      customerOnline: customerPresence.isOnline,
      customerPresenceLabel: customerPresence.label,
    }
  })

  return { data: mapped, error: null }
}

export const getDashboardConversationById = async (conversationId: string) => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  if (!data?.id) {
    return { data: null, error: null }
  }

  const customerUserId = safeText(data.customer_user_id)
  const vendorUserId = safeText(data.vendor_user_id)
  const identityMap = await loadUserIdentityMap([customerUserId, vendorUserId])
  const vendorStoreMap = await loadVendorStoreNameMap([vendorUserId])
  const customerIdentity = identityMap.get(customerUserId)
  const customerEmail = safeText(customerIdentity?.email)
  const customerAlias = toEmailAlias(customerEmail)
  const vendorStoreName = safeText(vendorStoreMap.get(vendorUserId))
  const customerPresence = getLastSeenLabel({
    lastActiveAt: customerIdentity?.lastSignInAt || null,
  })
  const unreadCountMap = await loadVendorUnreadCountMap([
    {
      id: safeText(data.id),
      customerUserId,
    },
  ])

  return {
    data: {
      id: safeText(data.id),
      customerUserId,
      vendorUserId,
      customerName:
        safeText(customerIdentity?.name) || customerAlias || fallbackUserLabel(customerUserId),
      vendorName: vendorStoreName || 'Seller',
      customerEmail,
      vendorEmail: safeText(identityMap.get(vendorUserId)?.email),
      productId: safeText(data.product_id),
      adminTakeoverEnabled: Boolean(data.admin_takeover_enabled),
      adminTakeoverBy: safeText(data.admin_takeover_by),
      adminTakeoverAt: formatIso(data.admin_takeover_at),
      createdAt: formatIso(data.created_at),
      updatedAt: formatIso(data.updated_at),
      lastMessageAt: formatIso(data.last_message_at),
      lastMessagePreview: safeText(data.last_message_preview),
      unreadCount: unreadCountMap.get(safeText(data.id)) || 0,
      customerOnline: customerPresence.isOnline,
      customerPresenceLabel: customerPresence.label,
    },
    error: null,
  }
}

export const listDashboardMessages = async (conversationId: string, limit = 200) => {
  const adminDb = createAdminSupabaseClient()
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 200))

  const { data, error } = await adminDb
    .from('chat_messages')
    .select(DASHBOARD_MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    return { data: [], error }
  }

  const messages = Array.isArray(data) ? [...data].reverse() : []
  const identityMap = await loadUserIdentityMap(
    messages.map((row: any) => String(row?.sender_user_id || '')),
  )

  return {
    data: messages.map((row: any) => {
      const senderUserId = safeText(row?.sender_user_id)
      const senderIdentity = identityMap.get(senderUserId)
      return {
        id: safeText(row?.id),
        conversationId: safeText(row?.conversation_id),
        senderUserId,
        senderName: safeText(senderIdentity?.name) || '',
        senderEmail: safeText(senderIdentity?.email),
        body: safeText(row?.body),
        createdAt: formatIso(row?.created_at),
      }
    }),
    error: null,
  }
}

export const insertDashboardMessage = async (
  conversationId: string,
  senderUserId: string,
  body: string,
) => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: senderUserId,
      body,
    })
    .select(DASHBOARD_MESSAGE_COLUMNS)
    .single()

  if (error || !data?.id) {
    return { data: null, error }
  }

  const identityMap = await loadUserIdentityMap([String(data.sender_user_id || '')])
  const senderUserIdSafe = safeText(data.sender_user_id)
  const senderIdentity = identityMap.get(senderUserIdSafe)

  return {
    data: {
      id: safeText(data.id),
      conversationId: safeText(data.conversation_id),
      senderUserId: senderUserIdSafe,
      senderName: safeText(senderIdentity?.name) || '',
      senderEmail: safeText(senderIdentity?.email),
      body: safeText(data.body),
      createdAt: formatIso(data.created_at),
    },
    error: null,
  }
}

export const deleteDashboardConversation = async (conversationId: string) => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId)
    .select('id')
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  if (!data?.id) {
    return { data: null, error: null }
  }

  return {
    data: {
      id: safeText(data.id),
    },
    error: null,
  }
}

export const enableDashboardConversationAdminTakeover = async (
  conversationId: string,
  adminUserId: string,
) => {
  const adminDb = createAdminSupabaseClient()
  const takeoverAt = new Date().toISOString()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .update({
      admin_takeover_enabled: true,
      admin_takeover_by: adminUserId,
      admin_takeover_at: takeoverAt,
      updated_at: takeoverAt,
    })
    .eq('id', conversationId)
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  return { data: data || null, error: null }
}

export const setDashboardConversationAdminTakeover = async (
  conversationId: string,
  {
    enabled,
    adminUserId,
  }: {
    enabled: boolean
    adminUserId: string
  },
) => {
  const adminDb = createAdminSupabaseClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .update({
      admin_takeover_enabled: enabled,
      admin_takeover_by: enabled ? adminUserId : null,
      admin_takeover_at: enabled ? nowIso : null,
      updated_at: nowIso,
    })
    .eq('id', conversationId)
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  return { data: data || null, error: null }
}
