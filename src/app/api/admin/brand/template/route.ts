import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { VALID_TEMPLATE_IDS, getTemplateDefaultBlocks } from '@/lib/vendor/templateConfig.mjs'

const brandIdSchema = z.string().uuid()

const genBlockId = () =>
  `block_${Date.now()}_${Math.floor(Math.random() * 100000)}`

/**
 * PATCH /api/admin/brand/template
 * Body: { template: string }
 *
 * Updates the storefront template for the authenticated vendor's brand.
 * Admins can optionally pass a brand_id to update any brand.
 *
 * When a template defines defaultBlocks, those blocks are seeded into the
 * store's storefront_blocks if no block of that type already exists.
 * Seeded blocks are per-vendor — deleting or editing them only affects that store.
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
    const parsedBrandId = brandIdSchema.safeParse(body.brand_id)
    if (!parsedBrandId.success) return jsonError('Invalid brand_id — must be a UUID.', 400)
    brandId = parsedBrandId.data
  } else {
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

  // --- Seed template default blocks ---
  // Only add block types the store doesn't already have — no duplicates on re-switch.
  const defaultBlocks = getTemplateDefaultBlocks(templateId)
  let blocksUpdate: Array<{ id: string; type: string; config: Record<string, unknown> }> | null = null
  let seededCount = 0

  if (defaultBlocks.length > 0) {
    const { data: brandData } = await supabase
      .from('admin_brands')
      .select('storefront_blocks')
      .eq('id', brandId)
      .maybeSingle()

    const existing: Array<{ id: string; type: string; template?: string; config: Record<string, unknown> }> =
      Array.isArray(brandData?.storefront_blocks) ? brandData.storefront_blocks : []

    // Only skip types where this specific template already has a live block.
    // If the vendor deleted the block, re-applying the template re-seeds it.
    const alreadySeededTypes = new Set(
      existing.filter((b) => b.template === templateId).map((b) => b.type),
    )

    const toSeed = defaultBlocks
      .filter((b) => !alreadySeededTypes.has(b.type))
      .map((b) => ({ id: genBlockId(), type: b.type, template: templateId, config: b.config as Record<string, unknown> }))

    if (toSeed.length > 0) {
      blocksUpdate = [...existing, ...toSeed]
      seededCount = toSeed.length
    }
  }

  // Always update template; also update blocks when new ones were seeded.
  const updatePayload: Record<string, unknown> = { template: templateId }
  if (blocksUpdate !== null) updatePayload.storefront_blocks = blocksUpdate

  const { error: updateError } = await supabase
    .from('admin_brands')
    .update(updatePayload)
    .eq('id', brandId)

  if (updateError) return jsonError('Failed to update template.', 500)

  return jsonOk({
    ok: true,
    template: templateId,
    blocks_added: seededCount > 0,
    seeded_count: seededCount,
  })
}
