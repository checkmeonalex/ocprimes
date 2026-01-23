import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
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

export async function listAttributeOptions(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listAttributeOptionsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { attribute_id } = parseResult.data

  const { data, error } = await supabase
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
  const { supabase, applyCookies, isAdmin, user } = await requireAdmin(request)

  if (!isAdmin) {
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

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await supabase
    .from(OPTIONS_TABLE)
    .insert({
      attribute_id: parsed.data.attribute_id,
      name: parsed.data.name,
      slug,
      color_hex: parsed.data.color_hex || null,
      sort_order: parsed.data.sort_order ?? 0,
      created_by: user?.id || null,
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
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
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

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await supabase
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
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
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

  const { error } = await supabase
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
