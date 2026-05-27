import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { buildSlug } from '@/lib/admin/taxonomy'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  brand_name: z.string().trim().min(2).max(120),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { isAdmin, applyCookies } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) return jsonError('Invalid vendor id.', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }

  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid brand payload.', 400)
  }

  const vendorId = parsedParams.data.id
  const brandName = parsedBody.data.brand_name.trim()
  const adminDb = createAdminSupabaseClient()

  const [{ data: vendorRole }, userResult, { data: existingBrand, error: existingBrandError }] = await Promise.all([
    adminDb.from('user_roles').select('role').eq('user_id', vendorId).maybeSingle(),
    adminDb.auth.admin.getUserById(vendorId),
    adminDb.from('admin_brands').select('id').eq('created_by', vendorId).maybeSingle(),
  ])

  if (!userResult?.data?.user?.id) {
    return jsonError('Vendor not found.', 404)
  }

  if (existingBrandError) {
    console.error('admin vendor existing brand lookup failed:', existingBrandError.message)
    return jsonError('Unable to validate vendor brand.', 500)
  }

  if (existingBrand?.id) {
    return jsonError('Vendor already has a brand.', 409)
  }

  if (String(vendorRole?.role || '').toLowerCase() !== 'vendor') {
    return jsonError('Only vendor accounts can be assigned to a brand.', 400)
  }

  const baseSlug = buildSlug(brandName) || `brand-${Date.now().toString().slice(-6)}`
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const { data: slugMatch, error: slugError } = await adminDb
      .from('admin_brands')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugError) {
      console.error('admin vendor create brand slug lookup failed:', slugError.message)
      return jsonError('Unable to prepare brand slug.', 500)
    }

    if (!slugMatch) break
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const { data: insertedBrand, error: insertError } = await adminDb
    .from('admin_brands')
    .insert({
      name: brandName,
      slug,
      created_by: vendorId,
    })
    .select('id, name, slug, created_by')
    .maybeSingle()

  if (insertError) {
    console.error('admin vendor create brand insert failed:', insertError.message)
    return jsonError('Unable to create brand for vendor.', 500)
  }

  const response = jsonOk({
    item: insertedBrand || null,
  })
  applyCookies(response)
  return response
}
