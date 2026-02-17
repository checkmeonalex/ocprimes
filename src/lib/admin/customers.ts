import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/admin/notifications'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional().default(''),
})

const customerAddressSchema = z.object({
  first_name: z.string().trim().max(120).optional(),
  last_name: z.string().trim().max(120).optional(),
  company: z.string().trim().max(160).optional(),
  address_line_1: z.string().trim().max(220).optional(),
  address_line_2: z.string().trim().max(220).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postal_code: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().max(255).optional(),
})

const patchCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  first_name: z.string().trim().max(120).optional(),
  last_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  job_title: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  address_line_1: z.string().trim().max(220).optional(),
  address_line_2: z.string().trim().max(220).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postal_code: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  billing: customerAddressSchema.optional(),
  shipping: customerAddressSchema.optional(),
  notify_customer: z.boolean().optional().default(false),
})

const passwordSchema = z.object({
  password: z.string().min(8).max(128),
})

const normalizeRole = (value: unknown) => {
  const role = String(value || '').toLowerCase()
  if (role === 'admin' || role === 'vendor') return role
  return 'customer'
}

const resolveDisplayName = (user: any) => {
  const metadata = user?.user_metadata || {}
  const profile = metadata?.profile || {}
  return (
    String(metadata?.full_name || '').trim() ||
    String(profile?.displayName || '').trim() ||
    String(profile?.contactInfo?.fullName || '').trim() ||
    String(user?.email || '').trim() ||
    'Customer'
  )
}

const mapCustomerSummary = (user: any, role: string) => {
  const metadata = user?.user_metadata || {}
  const profile = metadata?.profile || {}
  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : []
  const primaryAddress = profile?.deliveryAddress && typeof profile.deliveryAddress === 'object'
    ? profile.deliveryAddress
    : addresses.find((item: any) => item && typeof item === 'object') || {}
  const contactInfo = profile?.contactInfo || {}
  const company =
    String(primaryAddress?.company || '').trim() ||
    String(contactInfo?.company || '').trim() ||
    ''
  const country =
    String(primaryAddress?.country || '').trim() ||
    ''
  const status = user?.email_confirmed_at ? 'active' : 'inactive'
  return {
    id: String(user?.id || ''),
    email: String(user?.email || ''),
    name: resolveDisplayName(user),
    phone:
      String(profile?.contactInfo?.phone || '').trim() ||
      String(metadata?.phone || '').trim() ||
      '',
    job_title:
      String(profile?.jobTitle || '').trim() ||
      String(profile?.contactInfo?.jobTitle || '').trim() ||
      '',
    avatar_url: String(metadata?.avatar_url || '').trim() || '',
    company,
    country,
    status,
    role,
    created_at: user?.created_at || null,
    last_sign_in_at: user?.last_sign_in_at || null,
  }
}

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const toDate = (value: unknown) => {
  if (!value) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date
}

const calcTrend = (current: number, previous: number) => {
  if (previous <= 0) {
    if (current <= 0) return { direction: 'flat' as const, percent: 0 }
    return { direction: 'up' as const, percent: 100 }
  }
  const diff = ((current - previous) / previous) * 100
  if (diff === 0) return { direction: 'flat' as const, percent: 0 }
  return {
    direction: diff > 0 ? ('up' as const) : ('down' as const),
    percent: Math.abs(Number(diff.toFixed(1))),
  }
}

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const getMonthRanges = () => {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { thisMonthStart, lastMonthStart }
}

const listAllUsers = async (db: any) => {
  const perPage = 200
  let page = 1
  const users: any[] = []
  let hasMore = true

  while (hasMore && page <= 100) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('admin customers stats listUsers failed:', error.message)
      break
    }
    const rows = Array.isArray(data?.users) ? data.users : []
    users.push(...rows)
    if (rows.length < perPage) {
      hasMore = false
      break
    }
    page += 1
  }

  return users
}

const getRoleMap = async (db: any, userIds: string[]) => {
  const roleByUserId = new Map<string, string>()
  const chunks = chunkArray(userIds, 500)
  for (const ids of chunks) {
    const { data, error } = await db.from('user_roles').select('user_id, role').in('user_id', ids)
    if (error) {
      console.error('admin customers stats role lookup failed:', error.message)
      continue
    }
    ;(data || []).forEach((row: any) => {
      roleByUserId.set(String(row?.user_id || ''), normalizeRole(row?.role))
    })
  }
  return roleByUserId
}

const countOrdersRange = async (db: any, table: string, start: Date | null, endExclusive: Date | null) => {
  let query = db.from(table).select('id', { count: 'exact', head: true })
  if (start) query = query.gte('created_at', start.toISOString())
  if (endExclusive) query = query.lt('created_at', endExclusive.toISOString())
  const { count, error } = await query
  if (error) return { count: null as number | null, error }
  return { count: Number(count || 0), error: null as any }
}

const getOrdersStats = async (db: any, thisMonthStart: Date, lastMonthStart: Date) => {
  const tableCandidates = ['orders', 'admin_orders']
  for (const table of tableCandidates) {
    const totalRes = await countOrdersRange(db, table, null, null)
    if (totalRes.error) continue
    const thisRes = await countOrdersRange(db, table, thisMonthStart, null)
    const lastRes = await countOrdersRange(db, table, lastMonthStart, thisMonthStart)
    if (thisRes.error || lastRes.error) continue
    return {
      total: totalRes.count || 0,
      thisMonth: thisRes.count || 0,
      lastMonth: lastRes.count || 0,
      source: table,
    }
  }
  return {
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    source: 'fallback',
  }
}

const getOrderCountsForCustomers = async (
  db: any,
  {
    customerIds,
    emails,
  }: {
    customerIds: string[]
    emails: string[]
  },
) => {
  const counts = new Map<string, number>()
  customerIds.forEach((id) => counts.set(id, 0))

  const tableCandidates = ['orders', 'admin_orders']
  const idColumnCandidates = ['customer_id', 'user_id']
  const emailColumnCandidates = ['customer_email', 'billing_email', 'email']

  for (const table of tableCandidates) {
    for (const column of idColumnCandidates) {
      if (!customerIds.length) continue
      const { data, error } = await db.from(table).select(`id, ${column}`).in(column, customerIds)
      if (error) continue
      ;(Array.isArray(data) ? data : []).forEach((row: any) => {
        const key = String(row?.[column] || '')
        if (!key || !counts.has(key)) return
        counts.set(key, Number(counts.get(key) || 0) + 1)
      })
      return counts
    }

    for (const column of emailColumnCandidates) {
      if (!emails.length) continue
      const { data, error } = await db.from(table).select(`id, ${column}`).in(column, emails)
      if (error) continue
      const byEmail = new Map<string, number>()
      ;(Array.isArray(data) ? data : []).forEach((row: any) => {
        const key = String(row?.[column] || '').trim().toLowerCase()
        if (!key) return
        byEmail.set(key, Number(byEmail.get(key) || 0) + 1)
      })
      return byEmail
    }
  }

  return counts
}

const extractAddress = (profile: any) => {
  if (profile?.deliveryAddress && typeof profile.deliveryAddress === 'object') {
    return profile.deliveryAddress
  }
  if (Array.isArray(profile?.addresses) && profile.addresses.length) {
    const first = profile.addresses.find((item: any) => item && typeof item === 'object')
    if (first) return first
  }
  return {}
}

const mapCustomerMeta = (user: any) => {
  const metadata = user?.user_metadata || {}
  const profile = metadata?.profile || {}
  const contactInfo = profile?.contactInfo || {}
  const billingAddress =
    profile?.billingAddress && typeof profile.billingAddress === 'object'
      ? profile.billingAddress
      : extractAddress(profile)
  const shippingAddress =
    profile?.shippingAddress && typeof profile.shippingAddress === 'object'
      ? profile.shippingAddress
      : {}
  const fullName = resolveDisplayName(user)
  const parts = fullName.split(' ').filter(Boolean)
  const firstName = String(contactInfo?.firstName || parts[0] || '').trim()
  const lastName = String(contactInfo?.lastName || parts.slice(1).join(' ') || '').trim()
  const email = String(user?.email || '').trim()
  const phone = String(contactInfo?.phone || metadata?.phone || '').trim()

  return {
    first_name: firstName,
    last_name: lastName,
    billing_first_name: firstName,
    billing_last_name: lastName,
    billing_phone: phone,
    billing_email: email,
    billing_company: String(billingAddress?.company || '').trim(),
    billing_address_1: String(billingAddress?.line1 || billingAddress?.address1 || '').trim(),
    billing_address_2: String(billingAddress?.line2 || billingAddress?.address2 || '').trim(),
    billing_city: String(billingAddress?.city || '').trim(),
    billing_state: String(billingAddress?.state || '').trim(),
    billing_postcode: String(billingAddress?.postalCode || billingAddress?.zip || '').trim(),
    billing_country: String(billingAddress?.country || '').trim(),
    shipping_first_name: firstName,
    shipping_last_name: lastName,
    shipping_company: String(shippingAddress?.company || '').trim(),
    shipping_address_1: String(shippingAddress?.line1 || shippingAddress?.address1 || '').trim(),
    shipping_address_2: String(shippingAddress?.line2 || shippingAddress?.address2 || '').trim(),
    shipping_city: String(shippingAddress?.city || '').trim(),
    shipping_state: String(shippingAddress?.state || '').trim(),
    shipping_postcode: String(shippingAddress?.postalCode || shippingAddress?.zip || '').trim(),
    shipping_country: String(shippingAddress?.country || '').trim(),
    shipping_phone: String(shippingAddress?.phone || '').trim(),
    shipping_email: String(shippingAddress?.email || '').trim(),
    description: String(profile?.bio || '').trim(),
    website: String(profile?.website || '').trim(),
    facebook: String(profile?.socials?.facebook || '').trim(),
    twitter: String(profile?.socials?.twitter || '').trim(),
    linkedin: String(profile?.socials?.linkedin || '').trim(),
    pinterest: String(profile?.socials?.pinterest || '').trim(),
    instagram: String(profile?.socials?.instagram || '').trim(),
  }
}

export async function listAdminCustomers(rawQuery: Record<string, unknown>) {
  const parsed = listQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return { error: 'Invalid query.', status: 400 as const }
  }

  const { page, per_page: perPage, q } = parsed.data
  const db = createAdminSupabaseClient()
  const users = await listAllUsers(db)
  const ids = users.map((item: any) => String(item?.id || '')).filter(Boolean)
  const roleByUserId = ids.length ? await getRoleMap(db, ids) : new Map<string, string>()

  const allCustomers = users
    .map((user: any) => {
      const role = roleByUserId.get(String(user?.id || '')) || 'customer'
      return mapCustomerSummary(user, role)
    })

  const safeQuery = String(q || '').trim().toLowerCase()
  const filtered = safeQuery
    ? allCustomers.filter((item) =>
        [item.name, item.email, item.phone, item.job_title]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(safeQuery)),
      )
    : allCustomers

  const totalCount = filtered.length
  const pages = Math.max(1, Math.ceil(totalCount / perPage))
  const safePage = Math.min(page, pages)
  const startIndex = (safePage - 1) * perPage
  const pageItems = filtered.slice(startIndex, startIndex + perPage)

  const emailToCustomerId = new Map<string, string>()
  pageItems.forEach((item: any) => {
    const email = String(item?.email || '').trim().toLowerCase()
    if (email) emailToCustomerId.set(email, String(item?.id || ''))
  })
  const customerIds = pageItems.map((item: any) => String(item?.id || '')).filter(Boolean)
  const emails = pageItems
    .map((item: any) => String(item?.email || '').trim().toLowerCase())
    .filter(Boolean)

  const countsMap = await getOrderCountsForCustomers(db, { customerIds, emails })
  const items = pageItems.map((item: any) => {
    const id = String(item?.id || '')
    const email = String(item?.email || '').trim().toLowerCase()
    const byId = Number((countsMap as Map<string, number>).get(id) || 0)
    const byEmailKey = emailToCustomerId.has(email) ? email : id
    const byEmail = Number((countsMap as Map<string, number>).get(byEmailKey) || 0)
    return {
      ...item,
      total_orders: Math.max(byId, byEmail, 0),
    }
  })

  return {
    payload: {
      items,
      page: safePage,
      per_page: perPage,
      total_count: totalCount,
      pages,
    },
  }
}

export async function getAdminCustomerStats() {
  const db = createAdminSupabaseClient()
  const users = await listAllUsers(db)
  const ids = users.map((item: any) => String(item?.id || '')).filter(Boolean)
  const roleByUserId = ids.length ? await getRoleMap(db, ids) : new Map<string, string>()

  const customers = users

  const { thisMonthStart, lastMonthStart } = getMonthRanges()
  const todayStart = startOfToday()

  const totalCustomers = customers.length
  const thisMonthCustomers = customers.filter((user: any) => {
    const value = toDate(user?.created_at)
    return value ? value >= thisMonthStart : false
  }).length
  const lastMonthCustomers = customers.filter((user: any) => {
    const value = toDate(user?.created_at)
    return value ? value >= lastMonthStart && value < thisMonthStart : false
  }).length

  const activeTodayUsers = customers
    .filter((user: any) => {
      const signInDate = toDate(user?.last_sign_in_at)
      const updatedDate = toDate(user?.updated_at)
      return Boolean(
        (signInDate && signInDate >= todayStart) ||
        (updatedDate && updatedDate >= todayStart),
      )
    })
    .map((user: any) => ({
      id: String(user?.id || ''),
      name: resolveDisplayName(user),
      avatar_url: String(user?.user_metadata?.avatar_url || '').trim() || '',
    }))

  const orders = await getOrdersStats(db, thisMonthStart, lastMonthStart)

  return {
    payload: {
      total_customers: totalCustomers,
      customers_this_month: thisMonthCustomers,
      customers_last_month: lastMonthCustomers,
      customers_trend: calcTrend(thisMonthCustomers, lastMonthCustomers),
      total_orders: orders.total,
      orders_this_month: orders.thisMonth,
      orders_last_month: orders.lastMonth,
      orders_trend: calcTrend(orders.thisMonth, orders.lastMonth),
      orders_source: orders.source,
      active_today_count: activeTodayUsers.length,
      active_today_users: activeTodayUsers.slice(0, 8),
    },
  }
}

export async function getAdminCustomerById(customerId: string) {
  const id = String(customerId || '').trim()
  if (!id) return { error: 'Invalid customer id.', status: 400 as const }

  const db = createAdminSupabaseClient()
  const [{ data: userRes, error: userError }, { data: roleRows, error: roleError }] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('user_roles').select('role').eq('user_id', id).limit(1),
  ])

  if (userError || !userRes?.user) {
    return { error: 'Customer not found.', status: 404 as const }
  }
  if (roleError) {
    console.error('admin customer role lookup failed:', roleError.message)
  }

  const role = normalizeRole(roleRows?.[0]?.role)

  const user = userRes.user
  const metadata = user?.user_metadata || {}
  const profile = metadata?.profile || {}
  const meta = mapCustomerMeta(user)

  const { data: reviewRows, error: reviewError } = await db
    .from('product_reviews')
    .select('id, rating, status, content, created_at')
    .eq('reviewer_user_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (reviewError) {
    console.error('admin customer reviews lookup failed:', reviewError.message)
  }

  return {
    payload: {
      id,
      role,
      email: String(user?.email || ''),
      name: resolveDisplayName(user),
      avatar_url: String(metadata?.avatar_url || '').trim() || '',
      phone:
        String(profile?.contactInfo?.phone || '').trim() ||
        String(metadata?.phone || '').trim() ||
        '',
      job_title:
        String(profile?.jobTitle || '').trim() ||
        String(profile?.contactInfo?.jobTitle || '').trim() ||
        '',
      meta,
      profile: {
        bio: String(profile?.bio || '').trim() || '',
        contactInfo: profile?.contactInfo || {},
        addresses: Array.isArray(profile?.addresses) ? profile.addresses : [],
        deliveryAddress: profile?.deliveryAddress || {},
        security: profile?.security || {},
      },
      reviews: Array.isArray(reviewRows) ? reviewRows : [],
      created_at: user?.created_at || null,
      updated_at: user?.updated_at || null,
    },
  }
}

export async function updateAdminCustomerById(customerId: string, rawPayload: unknown) {
  const id = String(customerId || '').trim()
  if (!id) return { error: 'Invalid customer id.', status: 400 as const }

  const parsed = patchCustomerSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid customer payload.', status: 400 as const }
  }

  const db = createAdminSupabaseClient()
  const { data: userRes, error: userError } = await db.auth.admin.getUserById(id)
  if (userError || !userRes?.user) {
    return { error: 'Customer not found.', status: 404 as const }
  }

  const { data: roleRows, error: roleError } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', id)
    .limit(1)
  if (roleError) {
    console.error('admin customer update role lookup failed:', roleError.message)
  }

  const input = parsed.data
  const existingUser = userRes.user
  const metadata = existingUser?.user_metadata || {}
  const profile = metadata?.profile || {}
  const contactInfo = profile?.contactInfo || {}
  const currentMeta = mapCustomerMeta(existingUser)

  const nextFirstName =
    input.first_name !== undefined
      ? input.first_name
      : currentMeta.first_name || contactInfo?.firstName || ''
  const nextLastName =
    input.last_name !== undefined
      ? input.last_name
      : currentMeta.last_name || contactInfo?.lastName || ''
  const nextFullName =
    input.name !== undefined
      ? input.name
      : `${nextFirstName} ${nextLastName}`.trim() || resolveDisplayName(existingUser)

  const mergedBilling = {
    first_name: input.billing?.first_name ?? input.first_name ?? currentMeta.billing_first_name ?? '',
    last_name: input.billing?.last_name ?? input.last_name ?? currentMeta.billing_last_name ?? '',
    company: input.billing?.company ?? currentMeta.billing_company ?? '',
    address_line_1: input.billing?.address_line_1 ?? input.address_line_1 ?? currentMeta.billing_address_1 ?? '',
    address_line_2: input.billing?.address_line_2 ?? input.address_line_2 ?? currentMeta.billing_address_2 ?? '',
    city: input.billing?.city ?? input.city ?? currentMeta.billing_city ?? '',
    state: input.billing?.state ?? input.state ?? currentMeta.billing_state ?? '',
    postal_code: input.billing?.postal_code ?? input.postal_code ?? currentMeta.billing_postcode ?? '',
    country: input.billing?.country ?? input.country ?? currentMeta.billing_country ?? '',
    phone: input.billing?.phone ?? input.phone ?? currentMeta.billing_phone ?? '',
    email: currentMeta.billing_email || String(existingUser?.email || ''),
  }
  const mergedShipping = {
    first_name: input.shipping?.first_name ?? currentMeta.shipping_first_name ?? mergedBilling.first_name,
    last_name: input.shipping?.last_name ?? currentMeta.shipping_last_name ?? mergedBilling.last_name,
    company: input.shipping?.company ?? currentMeta.shipping_company ?? mergedBilling.company,
    address_line_1: input.shipping?.address_line_1 ?? currentMeta.shipping_address_1 ?? mergedBilling.address_line_1,
    address_line_2: input.shipping?.address_line_2 ?? currentMeta.shipping_address_2 ?? mergedBilling.address_line_2,
    city: input.shipping?.city ?? currentMeta.shipping_city ?? mergedBilling.city,
    state: input.shipping?.state ?? currentMeta.shipping_state ?? mergedBilling.state,
    postal_code: input.shipping?.postal_code ?? currentMeta.shipping_postcode ?? mergedBilling.postal_code,
    country: input.shipping?.country ?? currentMeta.shipping_country ?? mergedBilling.country,
    phone: input.shipping?.phone ?? currentMeta.shipping_phone ?? mergedBilling.phone,
    email: currentMeta.shipping_email || String(existingUser?.email || ''),
  }

  const nextProfile = {
    ...profile,
    bio: input.bio !== undefined ? input.bio : profile?.bio || '',
    jobTitle: input.job_title !== undefined ? input.job_title : profile?.jobTitle || '',
    billingAddress: {
      line1: mergedBilling.address_line_1,
      line2: mergedBilling.address_line_2,
      city: mergedBilling.city,
      state: mergedBilling.state,
      postalCode: mergedBilling.postal_code,
      country: mergedBilling.country,
      company: mergedBilling.company,
    },
    shippingAddress: {
      line1: mergedShipping.address_line_1,
      line2: mergedShipping.address_line_2,
      city: mergedShipping.city,
      state: mergedShipping.state,
      postalCode: mergedShipping.postal_code,
      country: mergedShipping.country,
      company: mergedShipping.company,
    },
    deliveryAddress: {
      line1: mergedBilling.address_line_1,
      line2: mergedBilling.address_line_2,
      city: mergedBilling.city,
      state: mergedBilling.state,
      postalCode: mergedBilling.postal_code,
      country: mergedBilling.country,
      company: mergedBilling.company,
    },
    addresses: [
      {
        line1: mergedBilling.address_line_1,
        line2: mergedBilling.address_line_2,
        city: mergedBilling.city,
        state: mergedBilling.state,
        postalCode: mergedBilling.postal_code,
        country: mergedBilling.country,
        company: mergedBilling.company,
      },
    ],
    contactInfo: {
      ...contactInfo,
      fullName: nextFullName,
      firstName: nextFirstName,
      lastName: nextLastName,
      phone:
        input.phone !== undefined
          ? input.phone
          : contactInfo?.phone || '',
      jobTitle:
        input.job_title !== undefined
          ? input.job_title
          : contactInfo?.jobTitle || '',
      email: String(existingUser?.email || ''),
    },
  }

  const nextMetadata = {
    ...metadata,
    full_name: nextFullName,
    phone: input.phone !== undefined ? input.phone : metadata?.phone || '',
    profile: nextProfile,
  }

  const updatePayload: Record<string, unknown> = {
    user_metadata: nextMetadata,
  }

  const { data: updatedRes, error: updateError } = await db.auth.admin.updateUserById(id, updatePayload)
  if (updateError) {
    console.error('admin customer update failed:', updateError.message)
    return { error: 'Unable to update customer.', status: 500 as const }
  }

  return {
    payload: {
      item: mapCustomerSummary(updatedRes?.user || existingUser, 'customer'),
      notify_customer: Boolean(input.notify_customer),
    },
  }
}

export async function setAdminCustomerPassword(
  customerId: string,
  rawPayload: unknown,
  actorUserId?: string | null,
) {
  const id = String(customerId || '').trim()
  if (!id) return { error: 'Invalid customer id.', status: 400 as const }

  const parsed = passwordSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid password payload.', status: 400 as const }
  }

  const db = createAdminSupabaseClient()
  const [{ data: userRes, error: userError }, { data: roleRows, error: roleError }] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('user_roles').select('role').eq('user_id', id).limit(1),
  ])

  if (userError || !userRes?.user) return { error: 'Customer not found.', status: 404 as const }
  if (roleError) console.error('admin customer password role lookup failed:', roleError.message)
  const recipientRole = normalizeRole(roleRows?.[0]?.role)

  const { error: updateError } = await db.auth.admin.updateUserById(id, {
    password: parsed.data.password,
  })
  if (updateError) {
    console.error('admin customer password update failed:', updateError.message)
    return { error: 'Unable to update password.', status: 500 as const }
  }

  await createNotifications(db, [
    {
      recipient_user_id: id,
      recipient_role: recipientRole,
      title: 'Password updated',
      message: 'Your account password was updated by an administrator.',
      type: 'account_security',
      severity: 'warning',
      entity_type: 'customer',
      entity_id: id,
      created_by: actorUserId || null,
    },
  ])

  return { payload: { success: true } }
}

export async function sendAdminCustomerPasswordReset(customerId: string, actorUserId?: string | null) {
  const id = String(customerId || '').trim()
  if (!id) return { error: 'Invalid customer id.', status: 400 as const }

  const db = createAdminSupabaseClient()
  const [{ data: userRes, error: userError }, { data: roleRows, error: roleError }] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('user_roles').select('role').eq('user_id', id).limit(1),
  ])

  if (userError || !userRes?.user) return { error: 'Customer not found.', status: 404 as const }
  if (roleError) console.error('admin customer reset role lookup failed:', roleError.message)
  const recipientRole = normalizeRole(roleRows?.[0]?.role)

  const email = String(userRes.user?.email || '').trim()
  if (!email) return { error: 'Customer email is missing.', status: 400 as const }

  const { error: resetError } = await db.auth.resetPasswordForEmail(email)
  if (resetError) {
    console.error('admin customer reset email failed:', resetError.message)
    return { error: 'Unable to send reset link.', status: 500 as const }
  }

  await createNotifications(db, [
    {
      recipient_user_id: id,
      recipient_role: recipientRole,
      title: 'Security alert: password reset',
      message:
        'We detected suspicious activity on your account and sent a password reset link to your email for your protection.',
      type: 'account_security',
      severity: 'info',
      entity_type: 'customer',
      entity_id: id,
      created_by: actorUserId || null,
    },
  ])

  return { payload: { success: true, email } }
}
