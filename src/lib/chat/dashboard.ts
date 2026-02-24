import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getLastSeenLabel } from '@/lib/chat/presence'
import { getSuperAdminEmail } from '@/lib/auth/superAdmin'
import { getNowIso } from '@/lib/time/virtual-now'

const DASHBOARD_CONVERSATION_COLUMNS =
  'id, customer_user_id, vendor_user_id, product_id, created_at, updated_at, last_message_at, last_message_preview, admin_takeover_enabled, admin_takeover_by, admin_takeover_at, closed_at, closed_by_user_id, closed_reason'

const DASHBOARD_MESSAGE_COLUMNS =
  'id, conversation_id, sender_user_id, body, created_at'
const UNIQUE_VIOLATION_CODE = '23505'

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

const findSuperAdminUserId = async (adminDb: ReturnType<typeof createAdminSupabaseClient>) => {
  const targetEmail = getSuperAdminEmail()
  const roleQuery = await adminDb
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(50)

  const roleRows = Array.isArray(roleQuery.data) ? roleQuery.data : []
  const roleError = roleQuery.error
  const candidateUserIds = new Set<string>()
  roleRows.forEach((row: any) => {
    const candidateUserId = safeText(row?.user_id)
    if (candidateUserId) candidateUserIds.add(candidateUserId)
  })

  if (candidateUserIds.size === 0) {
    const profileQuery = await adminDb
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(50)
    const profileRows = Array.isArray(profileQuery.data) ? profileQuery.data : []
    profileRows.forEach((row: any) => {
      const candidateUserId = safeText(row?.id)
      if (candidateUserId) candidateUserIds.add(candidateUserId)
    })
  }

  for (const candidateUserId of candidateUserIds) {
    const { data: userRow, error: userError } = await adminDb.auth.admin.getUserById(candidateUserId)
    if (userError || !userRow?.user?.id) continue
    const email = safeText(userRow.user.email).toLowerCase()
    if (email && email === targetEmail) {
      return { data: candidateUserId, error: null }
    }
  }

  const listUsersResult = await adminDb.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (!listUsersResult.error && Array.isArray(listUsersResult.data?.users)) {
    const matched = listUsersResult.data.users.find(
      (user: any) => safeText(user?.email).toLowerCase() === targetEmail,
    )
    const matchedId = safeText(matched?.id)
    if (matchedId) {
      return { data: matchedId, error: null }
    }
  }

  return { data: '', error: new Error('Super admin account not found.') }
}

const resolveSupportProductId = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  vendorUserId: string,
) => {
  const chatLinkedProduct = await adminDb
    .from('chat_conversations')
    .select('product_id')
    .or(`customer_user_id.eq.${vendorUserId},vendor_user_id.eq.${vendorUserId}`)
    .not('product_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (chatLinkedProduct.data?.product_id) {
    return { data: safeText(chatLinkedProduct.data.product_id), error: null }
  }

  const ownProduct = await adminDb
    .from('products')
    .select('id')
    .eq('created_by', vendorUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ownProduct.data?.id) {
    return { data: safeText(ownProduct.data.id), error: null }
  }

  const fallbackProduct = await adminDb
    .from('products')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fallbackProduct.error) {
    return { data: '', error: fallbackProduct.error }
  }

  return { data: safeText(fallbackProduct.data?.id), error: null }
}

export const loadUserIdentityMap = async (userIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)))
  const identityMap = new Map<string, { email: string; name: string }>()

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data, error } = await adminDb.auth.admin.getUserById(userId)
        if (error || !data?.user?.id) return
        const email = safeText(data.user.email)
        identityMap.set(String(data.user.id), {
          email,
          name: toEmailAlias(email),
        })
      } catch {
        // Ignore single-user lookup failures and keep fallback labels.
      }
    }),
  )

  return identityMap
}

const loadUserPresenceMap = async (userIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)))
  if (!uniqueIds.length) return new Map<string, string>()

  const { data, error } = await adminDb
    .from('user_presence')
    .select('user_id, last_seen_at')
    .in('user_id', uniqueIds)

  if (error || !Array.isArray(data)) return new Map<string, string>()

  const presenceByUserId = new Map<string, string>()
  data.forEach((row: any) => {
    const userId = safeText(row?.user_id)
    const lastSeenAt = formatIso(row?.last_seen_at)
    if (!userId || !lastSeenAt) return
    presenceByUserId.set(userId, lastSeenAt)
  })
  return presenceByUserId
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
  const presenceMap = await loadUserPresenceMap(
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
      lastActiveAt: presenceMap.get(customerUserId) || null,
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
      closedAt: formatIso(row?.closed_at),
      closedByUserId: safeText(row?.closed_by_user_id),
      closedReason: safeText(row?.closed_reason),
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
  const presenceMap = await loadUserPresenceMap([customerUserId, vendorUserId])
  const vendorStoreMap = await loadVendorStoreNameMap([vendorUserId])
  const customerIdentity = identityMap.get(customerUserId)
  const customerEmail = safeText(customerIdentity?.email)
  const customerAlias = toEmailAlias(customerEmail)
  const vendorStoreName = safeText(vendorStoreMap.get(vendorUserId))
  const customerPresence = getLastSeenLabel({
    lastActiveAt: presenceMap.get(customerUserId) || null,
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
      closedAt: formatIso(data.closed_at),
      closedByUserId: safeText(data.closed_by_user_id),
      closedReason: safeText(data.closed_reason),
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
  const takeoverAt = getNowIso()

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
  const nowIso = getNowIso()

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

export const findOrCreateDashboardHelpCenterConversation = async (vendorUserId: string) => {
  const safeVendorUserId = safeText(vendorUserId)
  if (!safeVendorUserId) {
    return { data: null, error: new Error('Missing vendor user.') }
  }

  const adminDb = createAdminSupabaseClient()
  const adminLookup = await findSuperAdminUserId(adminDb)
  if (adminLookup.error || !adminLookup.data) {
    return { data: null, error: adminLookup.error || new Error('Admin account unavailable.') }
  }

  const adminUserId = safeText(adminLookup.data)
  if (!adminUserId) {
    return { data: null, error: new Error('Admin account unavailable.') }
  }

  if (adminUserId === safeVendorUserId) {
    return { data: null, error: new Error('Admin cannot open Help Center with self.') }
  }

  const existingResult = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .eq('customer_user_id', safeVendorUserId)
    .eq('vendor_user_id', adminUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingResult.error) {
    return { data: null, error: existingResult.error }
  }

  if (existingResult.data?.id) {
    const resolved = await getDashboardConversationById(safeText(existingResult.data.id))
    return { data: resolved.data, error: resolved.error }
  }

  const reverseExistingResult = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .eq('customer_user_id', adminUserId)
    .eq('vendor_user_id', safeVendorUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (reverseExistingResult.error) {
    return { data: null, error: reverseExistingResult.error }
  }

  if (reverseExistingResult.data?.id) {
    const resolved = await getDashboardConversationById(safeText(reverseExistingResult.data.id))
    return { data: resolved.data, error: resolved.error }
  }

  const supportProduct = await resolveSupportProductId(adminDb, safeVendorUserId)
  if (supportProduct.error || !supportProduct.data) {
    return {
      data: null,
      error: supportProduct.error || new Error('No product available to initialize Help Center chat.'),
    }
  }

  const inserted = await adminDb
    .from('chat_conversations')
    .insert({
      customer_user_id: safeVendorUserId,
      vendor_user_id: adminUserId,
      product_id: supportProduct.data,
    })
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .maybeSingle()

  if (inserted.error) {
    if (String(inserted.error.code || '') === UNIQUE_VIOLATION_CODE) {
      const conflictResult = await adminDb
        .from('chat_conversations')
        .select(DASHBOARD_CONVERSATION_COLUMNS)
        .eq('customer_user_id', safeVendorUserId)
        .eq('vendor_user_id', adminUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (conflictResult.error || !conflictResult.data?.id) {
        return {
          data: null,
          error: conflictResult.error || new Error('Unable to resolve Help Center conversation.'),
        }
      }
      const resolved = await getDashboardConversationById(safeText(conflictResult.data.id))
      return { data: resolved.data, error: resolved.error }
    }
    return { data: null, error: inserted.error }
  }

  if (!inserted.data?.id) {
    return { data: null, error: new Error('Unable to create Help Center conversation.') }
  }

  const resolved = await getDashboardConversationById(safeText(inserted.data.id))
  return { data: resolved.data, error: resolved.error }
}
