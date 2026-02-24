import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getNowIso } from '@/lib/time/virtual-now'

const CHAT_CONVERSATION_COLUMNS =
  'id, customer_user_id, vendor_user_id, product_id, created_at, updated_at, last_message_at, last_message_preview, closed_at, closed_by_user_id, closed_reason'

const CHAT_MESSAGE_COLUMNS =
  'id, conversation_id, sender_user_id, body, created_at, vendor_received_at, vendor_read_at'

const UNIQUE_VIOLATION_CODE = '23505'

const toIsoString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const toEmailAlias = (email: string) => {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return ''
  const [localPart] = normalized.split('@')
  if (localPart) return localPart
  return normalized.replace(/@/g, '')
}

export const toChatConversationPayload = (row: any) => ({
  id: String(row?.id || ''),
  customerUserId: String(row?.customer_user_id || ''),
  vendorUserId: String(row?.vendor_user_id || ''),
  productId: String(row?.product_id || ''),
  createdAt: toIsoString(row?.created_at),
  updatedAt: toIsoString(row?.updated_at),
  lastMessageAt: toIsoString(row?.last_message_at),
  lastMessagePreview: String(row?.last_message_preview || ''),
  closedAt: toIsoString(row?.closed_at),
  closedByUserId: String(row?.closed_by_user_id || ''),
  closedReason: String(row?.closed_reason || ''),
})

export const toChatMessagePayload = (row: any, currentUserId: string) => ({
  id: String(row?.id || ''),
  conversationId: String(row?.conversation_id || ''),
  senderUserId: String(row?.sender_user_id || ''),
  sender: String(row?.sender_user_id || '') === currentUserId ? 'self' : 'other',
  body: String(row?.body || ''),
  createdAt: toIsoString(row?.created_at),
  vendorReceivedAt: toIsoString(row?.vendor_received_at),
  vendorReadAt: toIsoString(row?.vendor_read_at),
})

export const listConversationsForUser = async (supabase: any, userId: string) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select(CHAT_CONVERSATION_COLUMNS)
    .or(`customer_user_id.eq.${userId},vendor_user_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  return {
    data: Array.isArray(data) ? data : [],
    error,
  }
}

export const resolveVendorUserIdForProduct = async (productId: string) => {
  const admin = createAdminSupabaseClient()

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id, created_by')
    .eq('id', productId)
    .maybeSingle()

  if (productError) {
    return {
      vendorUserId: null,
      productExists: false,
      error: productError,
    }
  }

  if (!product?.id) {
    return {
      vendorUserId: null,
      productExists: false,
      error: null,
    }
  }

  const { data: links, error: linkError } = await admin
    .from('product_brand_links')
    .select('brand_id')
    .eq('product_id', productId)
    .limit(1)

  if (linkError) {
    return {
      vendorUserId: null,
      productExists: true,
      error: linkError,
    }
  }

  const primaryBrandId = String(links?.[0]?.brand_id || '').trim()
  let brandOwnerUserId = ''

  if (primaryBrandId) {
    const { data: brand, error: brandError } = await admin
      .from('admin_brands')
      .select('created_by')
      .eq('id', primaryBrandId)
      .maybeSingle()

    if (brandError && brandError.code !== 'PGRST116') {
      return {
        vendorUserId: null,
        productExists: true,
        error: brandError,
      }
    }

    brandOwnerUserId = String(brand?.created_by || '').trim()
  }

  const productOwnerUserId = String(product.created_by || '').trim()
  const vendorUserId = brandOwnerUserId || productOwnerUserId || null

  return {
    vendorUserId,
    productExists: true,
    error: null,
  }
}

export const findOrCreateConversation = async (
  supabase: any,
  customerUserId: string,
  vendorUserId: string,
  productId: string,
) => {
  const baseQuery = supabase
    .from('chat_conversations')
    .select(CHAT_CONVERSATION_COLUMNS)
    .eq('customer_user_id', customerUserId)
    .eq('vendor_user_id', vendorUserId)
    .eq('product_id', productId)

  const existing = await baseQuery.maybeSingle()
  if (existing.data?.id) {
    return existing
  }

  if (existing.error && existing.error.code !== 'PGRST116') {
    return existing
  }

  const inserted = await supabase
    .from('chat_conversations')
    .insert({
      customer_user_id: customerUserId,
      vendor_user_id: vendorUserId,
      product_id: productId,
    })
    .select(CHAT_CONVERSATION_COLUMNS)
    .single()

  if (!inserted.error) {
    return inserted
  }

  if (String(inserted.error?.code || '') !== UNIQUE_VIOLATION_CODE) {
    return inserted
  }

  return baseQuery.maybeSingle()
}

export const getConversationForUser = async (
  supabase: any,
  conversationId: string,
  userId: string,
) =>
  supabase
    .from('chat_conversations')
    .select(CHAT_CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .or(`customer_user_id.eq.${userId},vendor_user_id.eq.${userId}`)
    .maybeSingle()

export const listMessagesForConversation = async (
  supabase: any,
  conversationId: string,
  limit = 50,
) => {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50))

  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  return {
    data: Array.isArray(data) ? [...data].reverse() : [],
    error,
  }
}

export const insertConversationMessage = async (
  supabase: any,
  conversationId: string,
  senderUserId: string,
  body: string,
) =>
  supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: senderUserId,
      body,
    })
    .select(CHAT_MESSAGE_COLUMNS)
    .single()

export const markVendorConversationMessageReceipts = async (
  supabase: any,
  conversationId: string,
  vendorUserId: string,
) => {
  const nowIso = getNowIso()
  const { error } = await supabase
    .from('chat_messages')
    .update({
      vendor_received_at: nowIso,
      vendor_read_at: nowIso,
    })
    .eq('conversation_id', conversationId)
    .neq('sender_user_id', vendorUserId)
    .is('vendor_read_at', null)

  return { error }
}

export const loadVendorDisplayNameMap = async (vendorUserIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueVendorIds = Array.from(
    new Set(vendorUserIds.map((id) => String(id || '').trim()).filter(Boolean)),
  )
  const nameMap = new Map<string, string>()

  if (!uniqueVendorIds.length) return nameMap

  const { data: brandRows } = await adminDb
    .from('admin_brands')
    .select('created_by, name, created_at')
    .in('created_by', uniqueVendorIds)
    .order('created_at', { ascending: true })

  ;(Array.isArray(brandRows) ? brandRows : []).forEach((row: any) => {
    const vendorUserId = String(row?.created_by || '').trim()
    const storeName = String(row?.name || '').trim()
    if (!vendorUserId || !storeName || nameMap.has(vendorUserId)) return
    nameMap.set(vendorUserId, storeName)
  })

  const fallbackIds = uniqueVendorIds.filter((id) => !nameMap.has(id))
  if (!fallbackIds.length) return nameMap

  await Promise.all(
    fallbackIds.map(async (vendorUserId) => {
      try {
        const { data, error } = await adminDb.auth.admin.getUserById(vendorUserId)
        if (error || !data?.user?.id) return
        const alias = toEmailAlias(String(data.user.email || '').trim())
        if (alias) nameMap.set(vendorUserId, alias)
      } catch {
        // Ignore fallback lookup failures.
      }
    }),
  )

  return nameMap
}
