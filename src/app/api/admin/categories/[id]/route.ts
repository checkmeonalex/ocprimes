import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const SAFE_OPTIONAL_SCHEMA_ERROR_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205'])

const buildBlockerMessage = (entries: Array<{ label: string; count: number }>) => {
  const active = entries.filter((entry) => Number(entry.count) > 0)
  if (!active.length) {
    return 'This category is still linked to other records. Remove those links first.'
  }
  return `This category cannot be deleted yet. Remove these links first: ${active
    .map((entry) => `${entry.count} ${entry.label}`)
    .join(', ')}.`
}

const isSafeOptionalSchemaError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  SAFE_OPTIONAL_SCHEMA_ERROR_CODES.has(String((error as { code?: string }).code || ''))

const readCount = (result: { count?: number | null; error?: unknown }, label: string) => {
  if (!result?.error) {
    return Number(result?.count || 0)
  }
  if (isSafeOptionalSchemaError(result.error)) {
    return 0
  }
  throw new Error(
    `${label}: ${
      typeof result.error === 'object' && result.error !== null && 'message' in result.error
        ? String((result.error as { message?: string }).message || 'Unknown error')
        : String(result.error)
    }`,
  )
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const categoryId = params?.id
  if (!categoryId) {
    return jsonError('Missing category id.', 400)
  }

  const { data, error } = await supabase
    .from('admin_categories')
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
    .eq('id', categoryId)
    .single()

  if (error) {
    console.error('category fetch failed:', error.message)
    return jsonError('Unable to load category.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }
  const supabase = createAdminSupabaseClient()

  const params = await context.params
  const categoryId = params?.id
  if (!categoryId) {
    return jsonError('Missing category id.', 400)
  }

  const [childCountResult] = await Promise.all([
    supabase.from('admin_categories').select('id', { count: 'exact', head: true }).eq('parent_id', categoryId),
  ])

  let blockers
  try {
    blockers = [
      { label: 'child categories', count: readCount(childCountResult, 'child categories') },
    ]
  } catch (error) {
    console.error('category delete blocker lookup failed:', error instanceof Error ? error.message : String(error))
    return jsonError('Unable to validate category delete.', 500)
  }

  if (blockers.some((entry) => entry.count > 0)) {
    return jsonError(buildBlockerMessage(blockers), 409)
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from('admin_categories')
    .select('id, name')
    .eq('id', categoryId)
    .maybeSingle()

  if (existingCategoryError) {
    console.error('category delete prefetch failed:', existingCategoryError.message)
    return jsonError('Unable to delete category.', 500)
  }
  if (!existingCategory?.id) {
    return jsonError('Category not found.', 404)
  }

  const { error: deleteError } = await supabase
    .from('admin_categories')
    .delete()
    .eq('id', categoryId)

  if (deleteError) {
    const errorCode = String((deleteError as { code?: string })?.code || '')
    console.error('category delete failed:', deleteError.message)
    if (errorCode === '23503') {
      return jsonError(buildBlockerMessage(blockers), 409)
    }
    return jsonError('Unable to delete category.', 500)
  }

  const { data: verifyCategory, error: verifyError } = await supabase
    .from('admin_categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle()

  if (verifyError) {
    console.error('category delete verify failed:', verifyError.message)
    return jsonError('Unable to verify category delete.', 500)
  }
  if (verifyCategory?.id) {
    return jsonError('Category delete did not complete.', 409)
  }

  const response = jsonOk({ deleted: true, item: existingCategory })
  applyCookies(response)
  return response
}
