import { z } from 'zod'

export const CONDITION_VALUES = ['brand_new', 'like_new', 'open_box', 'refurbished', 'handmade', 'okx'] as const
export const PACKAGING_VALUES = ['in_wrap_nylon', 'in_a_box', 'premium_gift_packaging', 'cardboard_wrap'] as const
export const RETURN_POLICY_VALUES = ['not_returnable', 'support_return'] as const
export const STATUS_VALUES = ['publish', 'draft', 'archived'] as const

export const listProductsInput = {
  page: z.number().int().min(1).optional().describe('Page number, defaults to 1'),
  per_page: z.number().int().min(1).max(50).optional().describe('Results per page, max 50'),
  status: z.enum(STATUS_VALUES).optional(),
  search: z.string().max(120).optional().describe('Search by name, slug, or SKU'),
}

export const getProductInput = {
  id: z.string().uuid().describe('Product UUID'),
}

const variationInput = z.object({
  attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'e.g. {"color":"Red","size":"M"}. For a color variation, also set a "color_hex" key (e.g. "#ef4444") so the storefront swatch dot shows the exact color — required for any color name not already recognized (black/white/gray/blue/red/green/yellow/orange/pink/purple/brown/navy/tan/floral/multicolor), and recommended always.',
    ),
  regular_price: z.union([z.string(), z.number()]).optional(),
  sale_price: z.union([z.string(), z.number()]).optional(),
  sku: z.string().max(120).optional(),
  stock_quantity: z.union([z.string(), z.number()]).optional(),
  image_id: z
    .string()
    .uuid()
    .optional()
    .describe(
      'The media id (from upload_media or list_media) of the image showing THIS specific variation — e.g. the blue-colorway photo for the "blue" variation. Set this so picking a variation swaps to its matching photo, same as manual editing.',
    ),
})

const productFields = {
  name: z.string().min(2).max(140),
  slug: z.string().max(140).optional(),
  short_description: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  price: z.number().min(0),
  discount_price: z.number().min(0).optional(),
  sku: z.string().max(120).optional(),
  stock_quantity: z.number().int().min(0),
  status: z.enum(STATUS_VALUES).optional(),
  product_type: z.enum(['simple', 'variable']).optional(),
  condition_check: z.enum(CONDITION_VALUES),
  packaging_style: z.enum(PACKAGING_VALUES),
  return_policy: z.enum(RETURN_POLICY_VALUES),
  category_ids: z.array(z.string().uuid()).optional(),
  tag_ids: z.array(z.string().uuid()).max(12).optional(),
  brand_ids: z.array(z.string().uuid()).optional(),
  image_ids: z.array(z.string().uuid()).optional(),
  main_image_id: z.string().uuid().nullable().optional(),
  variations: z
    .array(variationInput)
    .optional()
    .describe('Full replacement list of variations, e.g. size/color combos with their own price/stock/sku'),
}

export const createProductInput = productFields

export const updateProductInput = {
  id: z.string().uuid().describe('Product UUID to update'),
  ...Object.fromEntries(
    Object.entries(productFields).map(([key, schema]) => [key, schema.optional()]),
  ),
}

export const deleteProductInput = {
  id: z.string().uuid().describe('Product UUID to delete'),
}

export const listTaxonomyInput = {
  search: z.string().max(120).optional(),
}

export const getCategoryTreeInput = {
  search: z.string().max(120).optional().describe('Filter by name substring'),
  limit: z.number().int().min(1).max(2000).optional().describe('Max categories to return, defaults to 500'),
}

export const createCategoryInput = {
  name: z.string().min(2).max(120),
  slug: z.string().max(120).optional().describe('Defaults to a slugified version of name'),
  description: z.string().max(500).optional(),
  parent_id: z.string().uuid().optional().describe('Parent category UUID, omit for a top-level category'),
}

export const updateCategoryInput = {
  id: z.string().uuid().describe('Category UUID to update'),
  name: z.string().min(2).max(120).optional(),
  slug: z.string().max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional().describe('Set null to move to top level'),
  image_url: z.string().url().max(500).nullable().optional(),
  image_alt: z.string().max(200).nullable().optional(),
  image_key: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional().describe('Toggling this cascades to all descendant categories'),
}

export const deleteCategoryInput = {
  id: z.string().uuid().describe('Category UUID to delete. Fails if it still has child categories.'),
}

export const deleteCategoriesInput = {
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(200)
    .describe(
      'Category UUIDs to delete in bulk. Deletes deepest-first so a parent and its children can be deleted together in one call.',
    ),
}

export const reorderCategoriesInput = {
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        parent_id: z.string().uuid().nullable().describe('New parent, or null for top-level'),
        sort_order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200)
    .describe('Full list of {id, parent_id, sort_order} tuples to apply. Call get_category_tree first to compute these.'),
}

export const uploadMediaInput = {
  image_url: z
    .string()
    .url()
    .max(2000)
    .optional()
    .describe('Public https URL of the image to fetch and upload. Provide this OR image_base64, not both.'),
  image_base64: z
    .string()
    .max(8_000_000)
    .optional()
    .describe(
      'Base64-encoded image data, optionally as a data: URI (e.g. "data:image/png;base64,...."). Provide this OR image_url, not both.',
    ),
  file_name: z.string().max(200).optional(),
  product_id: z.string().uuid().optional().describe('Attach directly to this product'),
  alt_text: z.string().max(200).optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
}

export const listMediaInput = {
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  filter: z.enum(['all', 'unattached', 'stale']).optional(),
}

export const deleteMediaInput = {
  id: z.string().uuid().describe('Media/image UUID to delete (from list_media). Also removes the underlying storage object.'),
}

export const listOrdersInput = {
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(50).optional(),
  status: z
    .enum([
      'all',
      'pending',
      'awaiting_payment',
      'payment_failed',
      'processing',
      'ready_to_ship',
      'out_for_delivery',
      'delivered',
      'refunded',
      'cancelled',
    ])
    .optional(),
  search: z.string().max(100).optional(),
}

export const getOrderInput = {
  orderId: z.string().min(1),
}

export const listVendorsInput = {
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  search: z.string().max(120).optional().describe('Search by vendor/store name or slug'),
}

export const getVendorStorefrontInput = {
  vendor_id: z.string().uuid().describe('Vendor UUID (the vendor user account id, same as admin_brands.created_by)'),
}

export const upsertVendorCustomHtmlSectionInput = {
  vendor_id: z.string().uuid().describe('Vendor UUID to edit the storefront of'),
  block_id: z
    .string()
    .max(100)
    .optional()
    .describe('Existing block id to update in place; omit to create a new banner/section'),
  html: z.string().max(20000).describe('Banner/section HTML (desktop, or the only variant if mobile is not set)'),
  js: z.string().max(20000).optional().describe('Optional JS, runs scoped to this section after mount'),
  mobile_enabled: z.boolean().optional().describe('Set true to serve different markup on mobile'),
  mobile_html: z.string().max(20000).optional(),
  mobile_js: z.string().max(20000).optional(),
}

export const deleteVendorStorefrontBlockInput = {
  vendor_id: z.string().uuid(),
  block_id: z.string().max(100),
}

export const HOME_BLOCK_TYPES = [
  'banner_grid',
  'hero_slider',
  'featured_strip',
  'hotspot',
  'logo_grid',
  'product_catalog',
  'browse_cards',
  'custom_html',
] as const

export const getHomeBlocksInput = {}

export const upsertHomeCustomHtmlSectionInput = {
  block_id: z
    .string()
    .max(100)
    .optional()
    .describe('Existing block id to update in place; omit to create a new section'),
  html: z.string().max(20000).describe('Section HTML (desktop, or the only variant if mobile is not set)'),
  js: z.string().max(20000).optional().describe('Optional JS, runs scoped to this section after mount'),
  mobile_enabled: z.boolean().optional().describe('Set true to serve different markup on mobile'),
  mobile_html: z.string().max(20000).optional(),
  mobile_js: z.string().max(20000).optional(),
}

export const deleteHomeBlockInput = {
  block_id: z.string().max(100).describe('Id of the homepage block to remove (any block type, not just custom_html)'),
}

export const updateOrderStatusInput = {
  orderId: z.string().min(1),
  status: z.enum([
    'pending',
    'awaiting_payment',
    'payment_failed',
    'processing',
    'ready_to_ship',
    'out_for_delivery',
    'delivered',
    'refunded',
    'cancelled',
  ]),
}
