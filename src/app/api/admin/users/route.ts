import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildSlug } from '@/lib/admin/taxonomy'

const createAdminUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(['vendor', 'customer']),
  brand_name: z.string().trim().min(2).max(120).optional(),
})

const MAX_AUTH_PAGES = 20
const AUTH_PAGE_SIZE = 200
const MISSING_COLUMN_CODE = '42703'

const listUsersFromAdminAuth = async (adminDb: ReturnType<typeof createAdminSupabaseClient>) => {
  const users: Array<{
    id: string
    email: string
    created_at: string
    user_metadata?: Record<string, unknown> | null
  }> = []

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const { data, error } = await adminDb.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    })
    if (error) {
      throw new Error(error.message || 'Unable to list auth users.')
    }
    const pageUsers = Array.isArray(data?.users) ? data.users : []
    if (!pageUsers.length) break
    pageUsers.forEach((entry) => {
      users.push({
        id: String(entry.id || ''),
        email: String(entry.email || ''),
        created_at: String(entry.created_at || ''),
        user_metadata:
          entry.user_metadata && typeof entry.user_metadata === 'object'
            ? (entry.user_metadata as Record<string, unknown>)
            : null,
      })
    })
    if (pageUsers.length < AUTH_PAGE_SIZE) break
  }

  const userIds = users.map((entry) => entry.id).filter(Boolean)
  const roleByUserId = new Map<string, string>()
  const profileByUserId = new Map<string, { full_name: string; role: string }>()

  if (userIds.length) {
    const [{ data: roleRows, error: roleError }, profileResult] = await Promise.all([
      adminDb
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds),
      adminDb.from('profiles').select('id, full_name, role').in('id', userIds),
    ])
    if (roleError) {
      throw new Error(roleError.message || 'Unable to load user roles.')
    }

    let profileRows: Array<{ id?: string; full_name?: string; role?: string }> = []
    const profileErrorCode = String((profileResult.error as { code?: string } | null)?.code || '')
    if (profileResult.error && profileErrorCode !== MISSING_COLUMN_CODE) {
      throw new Error(profileResult.error.message || 'Unable to load user profiles.')
    }
    if (!profileResult.error) {
      profileRows = Array.isArray(profileResult.data)
        ? (profileResult.data as Array<{ id?: string; full_name?: string; role?: string }>)
        : []
    } else {
      const fallbackProfileRes = await adminDb.from('profiles').select('id, role').in('id', userIds)
      if (fallbackProfileRes.error) {
        throw new Error(fallbackProfileRes.error.message || 'Unable to load user profiles.')
      }
      profileRows = Array.isArray(fallbackProfileRes.data)
        ? (fallbackProfileRes.data as Array<{ id?: string; role?: string }>)
        : []
    }

    ;(Array.isArray(roleRows) ? roleRows : []).forEach((row) => {
      const userId = String((row as { user_id?: string }).user_id || '').trim()
      if (!userId || roleByUserId.has(userId)) return
      roleByUserId.set(userId, String((row as { role?: string }).role || '').trim().toLowerCase())
    })
    ;(profileRows || []).forEach((row) => {
      const userId = String((row as { id?: string }).id || '').trim()
      if (!userId || profileByUserId.has(userId)) return
      profileByUserId.set(userId, {
        full_name: String((row as { full_name?: string }).full_name || '').trim(),
        role: String((row as { role?: string }).role || '').trim().toLowerCase(),
      })
    })
  }

  const items = users.map((entry) => {
    const profile = profileByUserId.get(entry.id)
    const metadataProfile =
      entry.user_metadata?.profile && typeof entry.user_metadata.profile === 'object'
        ? (entry.user_metadata.profile as Record<string, unknown>)
        : {}
    const metadataContact =
      metadataProfile?.contactInfo && typeof metadataProfile.contactInfo === 'object'
        ? (metadataProfile.contactInfo as Record<string, unknown>)
        : {}
    const metadataName = String(
      entry.user_metadata?.full_name || metadataContact?.fullName || metadataProfile?.full_name || '',
    ).trim()
    const role =
      roleByUserId.get(entry.id) ||
      String(profile?.role || '').trim().toLowerCase() ||
      'customer'
    return {
      id: entry.id,
      email: entry.email,
      full_name: metadataName || String(profile?.full_name || '').trim(),
      role,
      created_at: entry.created_at,
    }
  })

  return items.sort((a, b) => {
    const left = new Date(a.created_at || '').getTime()
    const right = new Date(b.created_at || '').getTime()
    return right - left
  })
}

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let data: unknown[] | null = null
  let error: { message?: string } | null = null
  try {
    const adminDb = createAdminSupabaseClient()
    const rpcResponse = await adminDb.rpc('list_admin_users')
    if (!rpcResponse.error) {
      data = (rpcResponse.data as unknown[] | null) ?? []
    } else {
      const fallback = await listUsersFromAdminAuth(adminDb)
      data = fallback
    }
  } catch (clientError) {
    error = { message: (clientError as Error)?.message || 'Admin client unavailable.' }
  }

  if (error) {
    console.error('Admin users fetch failed:', error.message)
    return jsonError('Unable to load users.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = createAdminUserSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid user payload.', 400)
  }

  const input = parsed.data
  if (input.role === 'vendor' && !String(input.brand_name || '').trim()) {
    return jsonError('Brand name is required for vendor account.', 400)
  }

  const adminDb = createAdminSupabaseClient()
  const { data: createRes, error: createError } = await adminDb.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      profile: {
        contactInfo: {
          fullName: input.full_name,
          email: input.email,
        },
      },
    },
  })

  if (createError) {
    console.error('Admin create user failed:', createError.message)
    return jsonError(createError.message || 'Unable to create user.', 400)
  }

  const userId = String(createRes?.user?.id || '')
  if (!userId) {
    return jsonError('Unable to create user.', 500)
  }

  const { error: roleError } = await adminDb.from('user_roles').upsert({
    user_id: userId,
    role: input.role,
  })
  if (roleError) {
    console.error('Admin create user role upsert failed:', roleError.message)
    return jsonError('User created but role assignment failed.', 500)
  }

  let brandItem: Record<string, unknown> | null = null
  if (input.role === 'vendor') {
    const brandName = String(input.brand_name || '').trim()
    const baseSlug = buildSlug(brandName) || `brand-${Date.now().toString().slice(-6)}`
    let slug = baseSlug
    let suffix = 2

    while (true) {
      const { data: existingBrand, error: existingErr } = await adminDb
        .from('admin_brands')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (existingErr) {
        console.error('Admin create vendor brand lookup failed:', existingErr.message)
        break
      }
      if (!existingBrand) break
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const { data: insertedBrand, error: brandError } = await adminDb
      .from('admin_brands')
      .insert({
        name: brandName,
        slug,
        created_by: userId,
      })
      .select('id, name, slug, created_by')
      .maybeSingle()

    if (brandError) {
      console.error('Admin create vendor brand failed:', brandError.message)
      return jsonError('Vendor created but brand creation failed.', 500)
    }
    brandItem = insertedBrand || null
  }

  const response = jsonOk({
    item: {
      id: userId,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      brand: brandItem,
    },
  })
  applyCookies(response)
  return response
}
