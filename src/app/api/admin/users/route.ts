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

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase.rpc('list_admin_users')

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
