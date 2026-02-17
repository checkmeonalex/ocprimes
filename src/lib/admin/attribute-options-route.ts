import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { buildSlug } from '@/lib/admin/taxonomy'
import {
  createAttributeOptionSchema,
  deleteAttributeOptionSchema,
  listAttributeOptionsSchema,
  updateAttributeOptionSchema,
} from '@/lib/admin/attribute-options'

const OPTIONS_TABLE = 'admin_attribute_options'

const buildMissingTableMessage = () =>
  'attribute options table not found. Run migration 015_admin_attribute_options.sql.'
const ATTRIBUTE_TABLE = 'admin_attributes'

const resolveAttributeAccess = async (
  supabase: any,
  attributeId: string,
  {
    isAdmin,
    isVendor,
    userId,
  }: { isAdmin: boolean; isVendor: boolean; userId: string },
) => {
  const { data: attribute, error } = await supabase
    .from(ATTRIBUTE_TABLE)
    .select('id, created_by')
    .eq('id', attributeId)
    .maybeSingle()

  if (error) return { error, canView: false, canEdit: false, attributeCreatedBy: null as string | null }
  if (!attribute?.id) {
    return { error: null, canView: false, canEdit: false, attributeCreatedBy: null as string | null }
  }
  if (isAdmin) {
    return {
      error: null,
      canView: true,
      canEdit: true,
      attributeCreatedBy: String(attribute?.created_by || '').trim() || null,
    }
  }

  const ownerId = String(attribute?.created_by || '').trim()
  if (isVendor && ownerId && ownerId === userId) {
    return { error: null, canView: true, canEdit: true, attributeCreatedBy: ownerId }
  }

  if (isVendor) {
    if (!ownerId) return { error: null, canView: true, canEdit: false, attributeCreatedBy: null as string | null }
  }

  return { error: null, canView: false, canEdit: false, attributeCreatedBy: ownerId || null }
}

export async function listAttributeOptions(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listAttributeOptionsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { attribute_id } = parseResult.data
  const access = await resolveAttributeAccess(db, attribute_id, {
    isAdmin,
    isVendor,
    userId: user.id,
  })
  if (access.error) {
    const errorCode = (access.error as { code?: string })?.code
    console.error('attribute options access lookup failed:', access.error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load attribute options.', 500)
  }
  if (!access.canView) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await db
    .from(OPTIONS_TABLE)
    .select('id, attribute_id, name, slug, color_hex, sort_order, created_at, created_by')
    .eq('attribute_id', attribute_id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute options list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load attribute options.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}

export async function createAttributeOption(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute option create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createAttributeOptionSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid attribute option.', 400)
  }

  const access = await resolveAttributeAccess(db, parsed.data.attribute_id, {
    isAdmin,
    isVendor,
    userId: user.id,
  })
  if (access.error) {
    const errorCode = (access.error as { code?: string })?.code
    console.error('attribute option create access lookup failed:', access.error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create attribute option.', 500)
  }
  if (!access.canEdit) {
    return jsonError('You can only add options to attributes you created.', 403)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await db
    .from(OPTIONS_TABLE)
    .insert({
      attribute_id: parsed.data.attribute_id,
      name: parsed.data.name,
      slug,
      color_hex: parsed.data.color_hex || null,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: access.attributeCreatedBy,
    })
    .select('id, attribute_id, name, slug, color_hex, sort_order, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute option create failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Option slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create attribute option.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function updateAttributeOption(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute option update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateAttributeOptionSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid attribute option.', 400)
  }

  const { data: existingOption, error: existingOptionError } = await db
    .from(OPTIONS_TABLE)
    .select('id, attribute_id')
    .eq('id', parsed.data.id)
    .maybeSingle()

  if (existingOptionError) {
    const errorCode = (existingOptionError as { code?: string })?.code
    console.error('attribute option update lookup failed:', existingOptionError.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update attribute option.', 500)
  }
  if (!existingOption?.id) {
    return jsonError('Option not found.', 404)
  }

  const access = await resolveAttributeAccess(db, existingOption.attribute_id, {
    isAdmin,
    isVendor,
    userId: user.id,
  })
  if (access.error) {
    const errorCode = (access.error as { code?: string })?.code
    console.error('attribute option update access lookup failed:', access.error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update attribute option.', 500)
  }
  if (!access.canEdit) {
    return jsonError('You can only edit options you created under your attributes.', 403)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await db
    .from(OPTIONS_TABLE)
    .update({
      name: parsed.data.name,
      slug,
      color_hex: parsed.data.color_hex || null,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .eq('id', parsed.data.id)
    .select('id, attribute_id, name, slug, color_hex, sort_order, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute option update failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Option slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update attribute option.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function deleteAttributeOption(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute option delete parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = deleteAttributeOptionSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid option id.', 400)
  }

  const { data: existingOption, error: existingOptionError } = await db
    .from(OPTIONS_TABLE)
    .select('id, attribute_id')
    .eq('id', parsed.data.id)
    .maybeSingle()

  if (existingOptionError) {
    const errorCode = (existingOptionError as { code?: string })?.code
    console.error('attribute option delete lookup failed:', existingOptionError.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to delete attribute option.', 500)
  }
  if (!existingOption?.id) {
    return jsonError('Option not found.', 404)
  }

  const access = await resolveAttributeAccess(db, existingOption.attribute_id, {
    isAdmin,
    isVendor,
    userId: user.id,
  })
  if (access.error) {
    const errorCode = (access.error as { code?: string })?.code
    console.error('attribute option delete access lookup failed:', access.error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to delete attribute option.', 500)
  }
  if (!access.canEdit) {
    return jsonError('You can only delete options from your own attributes.', 403)
  }

  const { error } = await db
    .from(OPTIONS_TABLE)
    .delete()
    .eq('id', parsed.data.id)

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute option delete failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to delete attribute option.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
