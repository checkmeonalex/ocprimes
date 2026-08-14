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
  size_guide_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Overrides the category default size guide for this product only. Use list_size_guides to find ids.'),
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
  size_guide_id: z
    .string()
    .uuid()
    .optional()
    .describe('Default size guide for products in this category. Use list_size_guides to find ids.'),
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
  size_guide_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Default size guide for products in this category; set null to remove. Use list_size_guides to find ids.'),
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

export const fetchImageInput = {
  url: z
    .string()
    .url()
    .max(2000)
    .describe('Public https URL of an image to fetch and view (e.g. a url from list_media or a product photo link). Not for arbitrary/non-image URLs.'),
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

const sizeGuideColumnInput = z.object({
  key: z.string().min(1).max(60).describe('Machine key for this column, e.g. "chest_in" or "size"'),
  label: z.string().min(1).max(60).describe('Header shown on the storefront, e.g. "Chest (in)"'),
})

export const listSizeGuidesInput = {
  search: z.string().max(120).optional(),
}

export const getSizeGuideInput = {
  id: z.string().uuid().describe('Size guide UUID'),
}

export const createSizeGuideInput = {
  name: z.string().min(2).max(140).describe('e.g. "Men\'s Shirts (UK/US/EU)"'),
  unit_toggle: z
    .boolean()
    .optional()
    .describe(
      'Show an IN/CM toggle on the storefront. Requires column key pairs like "chest_in"/"chest_cm" sharing the same label base.',
    ),
  columns: z.array(sizeGuideColumnInput).min(1).max(20),
  rows: z
    .array(z.record(z.string(), z.string()))
    .max(100)
    .optional()
    .describe('Each row is an object keyed by column key, e.g. {"size":"M","chest_in":"38-40"}'),
  how_to_measure: z.string().max(4000).optional(),
  notes: z.string().max(2000).optional(),
}

export const updateSizeGuideInput = {
  id: z.string().uuid().describe('Size guide UUID to update'),
  name: z.string().min(2).max(140).optional(),
  unit_toggle: z.boolean().optional(),
  columns: z.array(sizeGuideColumnInput).min(1).max(20).optional(),
  rows: z.array(z.record(z.string(), z.string())).max(100).optional(),
  how_to_measure: z.string().max(4000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
}

export const deleteSizeGuideInput = {
  id: z.string().uuid().describe('Size guide UUID to delete. Fails if still assigned to a category or product.'),
}

// ── Shipping / logistics ────────────────────────────────────────────────────

const etaKeyInput = z
  .enum([
    'express_2_24_hours',
    'express_1_3_days',
    'express_3_7_days',
    'standard_1_2_days',
    'standard_1_3_days',
    'standard_2_5_days',
    'express',
    'standard',
  ])
  .optional()
  .describe(
    'ETA preset shown at checkout. Precise keys: express_2_24_hours (same day), express_1_3_days, express_3_7_days, standard_1_2_days, standard_1_3_days, standard_2_5_days. The loose aliases "standard"/"express" also work and map to a sane default. Omit to keep the current ETA.',
  )

export const getShippingSettingsInput = {
  state: z
    .string()
    .max(80)
    .optional()
    .describe(
      'Nigerian state to fetch per-city rates for, e.g. "Lagos". Case-insensitive, accepts common abbreviations. Omit to default to the first state — call this first with no state to see the full list of valid state names in the response.',
    ),
}

const shippingCityRateInput = z.object({
  city: z.string().min(1).max(120).describe('City name within the target state, e.g. "Ikeja". Must be a recognized city for that state — call get_shipping_settings first to see valid city names.'),
  standard_price: z.number().min(0).max(10000000).describe('Standard delivery fee in NGN for this city.'),
  express_price: z.number().min(0).max(10000000).describe('Express delivery fee in NGN for this city.'),
  standard_eta_key: etaKeyInput,
  express_eta_key: etaKeyInput,
})

export const updateShippingRatesInput = {
  state: z.string().min(1).max(80).describe('Nigerian state these rates apply to, e.g. "Lagos". Call get_shipping_settings first to confirm the exact state name.'),
  rates: z
    .array(shippingCityRateInput)
    .min(1)
    .max(60)
    .describe('One entry per city being updated in this state. Only cities included here are changed — other cities in the state keep their existing rates.'),
}

export const updateWorldwideShippingFeeInput = {
  fixed_price_usd: z.number().min(0).max(100000).describe('Flat shipping fee in USD charged for orders shipping outside Nigeria.'),
  eta_key: etaKeyInput,
}
