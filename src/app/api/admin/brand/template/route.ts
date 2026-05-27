import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { VALID_TEMPLATE_IDS } from '@/lib/vendor/templateConfig.mjs'

/**
 * PATCH /api/admin/brand/template
 * Body: { template: string }
 *
 * Updates the storefront template for the authenticated vendor's brand.
 * Admins can optionally pass a brand_id to update any brand.
 */
export async function PATCH(req: NextRequest) {
  const { user, isAdmin, canManageCatalog } = await requireDashboardUser(req)

  if (!canManageCatalog || !user?.id) return jsonError('Unauthorized.', 401)

  let body: { template?: string; brand_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const templateId = String(body.template || '').trim().toLowerCase()
  if (!VALID_TEMPLATE_IDS.includes(templateId)) {
    return jsonError(`Unknown template "${templateId}". Valid options: ${VALID_TEMPLATE_IDS.join(', ')}.`, 400)
  }

  const supabase = createAdminSupabaseClient()

  // Admins can target a specific brand; vendors can only update their own brand.
  let brandId: string | null = null

  if (isAdmin && body.brand_id) {
    brandId = String(body.brand_id).trim()
  } else {
    // Find the brand that belongs to this vendor user.
    const { data, error } = await supabase
      .from('admin_brands')
      .select('id')
      .eq('created_by', user.id)
      .limit(1)
      .maybeSingle()

    if (error) return jsonError('Failed to look up your brand.', 500)
    if (!data?.id) return jsonError('No brand found for your account.', 404)
    brandId = data.id
  }

  const { error: updateError } = await supabase
    .from('admin_brands')
    .update({ template: templateId })
    .eq('id', brandId)

  if (updateError) return jsonError('Failed to update template.', 500)

  return jsonOk({ ok: true, template: templateId })
}
