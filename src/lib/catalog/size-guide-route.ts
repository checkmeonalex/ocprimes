import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { jsonError, jsonOk } from '@/lib/http/response'

const SIZE_GUIDE_SELECT =
  'id, name, unit_toggle, columns, rows, how_to_measure, notes'

// A product's own size_guide_id wins; otherwise fall back to its first
// linked category's size_guide_id (categories rarely have more than one,
// and there's no notion of ordering/priority among them today).
export async function getPublicProductSizeGuide(request: NextRequest, slug: string) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  if (!slug || typeof slug !== 'string') {
    return jsonError('Invalid product slug.', 400)
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, size_guide_id')
    .eq('slug', slug)
    .maybeSingle()

  if (productError) {
    console.error('size guide product lookup failed:', productError.message)
    return jsonError('Unable to load size guide.', 500)
  }
  if (!product?.id) {
    return jsonError('Product not found.', 404)
  }

  let sizeGuideId = product.size_guide_id || null

  if (!sizeGuideId) {
    const { data: link, error: linkError } = await supabase
      .from('product_category_links')
      .select('category_id, admin_categories!inner(size_guide_id)')
      .eq('product_id', product.id)
      .not('admin_categories.size_guide_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (linkError) {
      console.error('size guide category lookup failed:', linkError.message)
    } else {
      const category = (link as any)?.admin_categories
      sizeGuideId = category?.size_guide_id || null
    }
  }

  if (!sizeGuideId) {
    const response = jsonOk({ item: null })
    applyCookies(response)
    return response
  }

  const { data: guide, error: guideError } = await supabase
    .from('size_guides')
    .select(SIZE_GUIDE_SELECT)
    .eq('id', sizeGuideId)
    .maybeSingle()

  if (guideError) {
    console.error('size guide fetch failed:', guideError.message)
    return jsonError('Unable to load size guide.', 500)
  }

  const response = jsonOk({ item: guide || null })
  applyCookies(response)
  return response
}
