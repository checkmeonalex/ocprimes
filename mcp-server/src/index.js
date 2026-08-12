import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { adminApiRequest, adminApiUpload } from './apiClient.js'
import {
  listProductsInput,
  getProductInput,
  createProductInput,
  updateProductInput,
  deleteProductInput,
  listTaxonomyInput,
  getCategoryTreeInput,
  createCategoryInput,
  updateCategoryInput,
  deleteCategoryInput,
  deleteCategoriesInput,
  reorderCategoriesInput,
  uploadMediaInput,
  listMediaInput,
  deleteMediaInput,
  listOrdersInput,
  getOrderInput,
  updateOrderStatusInput,
  listVendorsInput,
  getVendorStorefrontInput,
  upsertVendorCustomHtmlSectionInput,
  deleteVendorStorefrontBlockInput,
  getHomeBlocksInput,
  upsertHomeCustomHtmlSectionInput,
  deleteHomeBlockInput,
  listSizeGuidesInput,
  getSizeGuideInput,
  createSizeGuideInput,
  updateSizeGuideInput,
  deleteSizeGuideInput,
  getShippingSettingsInput,
  updateShippingRatesInput,
  updateWorldwideShippingFeeInput,
} from './schemas.js'

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const server = new McpServer({
  name: 'ocprimes-admin',
  version: '0.1.0',
})

const textResult = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
})

const storefrontBaseUrl = () => (process.env.APP_BASE_URL || '').replace(/\/+$/, '')

const withStorefrontUrl = (payload) => {
  const slug = payload?.item?.slug || payload?.slug
  if (!slug) return payload
  const base = storefrontBaseUrl()
  const storefront_url = base ? `${base}/product/${slug}` : undefined
  if (!storefront_url) return payload
  if (payload?.item) return { ...payload, item: { ...payload.item, storefront_url } }
  return { ...payload, storefront_url }
}

const errorResult = (error) => ({
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true,
})

server.registerTool(
  'list_products',
  {
    title: 'List products',
    description: 'List store products with optional search, status filter, and pagination.',
    inputSchema: listProductsInput,
  },
  async ({ page, per_page, status, search }) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (per_page) params.set('per_page', String(per_page))
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    try {
      const data = await adminApiRequest(`/api/admin/products?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'get_product',
  {
    title: 'Get product',
    description: 'Fetch a single product by its UUID. Response includes storefront_url, the public product page link.',
    inputSchema: getProductInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/products/${id}`)
      return textResult(withStorefrontUrl(data))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'create_product',
  {
    title: 'Create product',
    description:
      'Create a new product. condition_check, packaging_style, and return_policy are required enums; category_ids/tag_ids/brand_ids/image_ids reference existing UUIDs (use list_categories/list_tags/list_brands). Response includes storefront_url, the public product page link. For each variation, set image_id (from upload_media or list_media) to the photo showing that specific color/size so picking the variation shows the matching photo, same as manual editing.',
    inputSchema: createProductInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/products', { method: 'POST', body: input })
      return textResult(withStorefrontUrl(data))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_product',
  {
    title: 'Update product',
    description:
      'Update fields on an existing product. Only send fields you want changed. Response includes storefront_url. For variations, set image_id per variation to link its matching photo (same as manual editing) — passing variations replaces the full list, so include image_id on every entry you want it set on.',
    inputSchema: updateProductInput,
  },
  async ({ id, ...rest }) => {
    try {
      const data = await adminApiRequest(`/api/admin/products/${id}`, { method: 'PATCH', body: rest })
      return textResult(withStorefrontUrl(data))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_product',
  {
    title: 'Delete product',
    description: 'Permanently delete a product by its UUID. This cannot be undone.',
    inputSchema: deleteProductInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/products/${id}`, { method: 'DELETE' })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Categories / tags / brands (reference lookups + create) ---

const registerTaxonomyTools = (name, path) => {
  server.registerTool(
    `list_${name}`,
    {
      title: `List ${name}`,
      description: `List ${name} with their UUIDs, needed to assign them to products.`,
      inputSchema: listTaxonomyInput,
    },
    async ({ search }) => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const data = await adminApiRequest(`${path}?${params.toString()}`)
        return textResult(data)
      } catch (error) {
        return errorResult(error)
      }
    },
  )
}

registerTaxonomyTools('categories', '/api/admin/categories')
registerTaxonomyTools('tags', '/api/admin/tags')
registerTaxonomyTools('brands', '/api/admin/brands')

// --- Category tree CRUD ---

server.registerTool(
  'get_category_tree',
  {
    title: 'Get product category tree',
    description:
      'Fetch the full nested product category tree with parent/child relationships, ids, slugs, and sort_order. Use before creating/editing/deleting/reordering categories to see current structure.',
    inputSchema: getCategoryTreeInput,
  },
  async ({ search, limit }) => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (limit) params.set('limit', String(limit))
      const data = await adminApiRequest(`/api/admin/categories/tree?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'create_category',
  {
    title: 'Create a product category',
    description: 'Create a new product category, optionally nested under a parent_id. Returns the new category with its id.',
    inputSchema: createCategoryInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/categories', { method: 'POST', body: input })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_category',
  {
    title: 'Update a product category',
    description:
      'Update fields on an existing category — name, slug, description, parent_id (reparent), image, or is_active. Only send fields you want changed. Toggling is_active cascades to all descendant categories.',
    inputSchema: updateCategoryInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/categories', { method: 'PATCH', body: input })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_category',
  {
    title: 'Delete a product category',
    description:
      'Permanently delete a single category by UUID. Fails with an error if it still has child categories — delete or reparent those first, or use delete_categories for bulk/subtree deletes.',
    inputSchema: deleteCategoryInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// /api/admin/categories/tree returns a flat list with parent_id — compute
// each node's depth by walking parent_id chains so bulk delete can order
// deepest-first (leaves before their ancestors).
const computeCategoryDepths = (flatItems) => {
  const byId = new Map()
  for (const item of flatItems || []) {
    if (item?.id) byId.set(item.id, item)
  }
  const depths = new Map()
  const depthOf = (id, guard = new Set()) => {
    if (depths.has(id)) return depths.get(id)
    if (guard.has(id)) return 0
    guard.add(id)
    const node = byId.get(id)
    const parentId = node?.parent_id
    const depth = parentId && byId.has(parentId) ? depthOf(parentId, guard) + 1 : 0
    depths.set(id, depth)
    return depth
  }
  for (const item of flatItems || []) {
    if (item?.id) depthOf(item.id)
  }
  return depths
}

server.registerTool(
  'delete_categories',
  {
    title: 'Delete multiple product categories at once',
    description:
      'Permanently delete many categories in one call, including whole subtrees — pass a parent id together with its descendant ids and they will be deleted deepest-first automatically, so the parent-child block does not fire. Any id not found or already deleted is skipped. Returns per-id results.',
    inputSchema: deleteCategoriesInput,
  },
  async ({ ids }) => {
    try {
      const tree = await adminApiRequest('/api/admin/categories/tree?limit=2000')
      const depths = computeCategoryDepths(tree?.items || [])
      const orderedIds = [...ids].sort((a, b) => (depths.get(b) ?? 0) - (depths.get(a) ?? 0))

      const results = []
      for (const id of orderedIds) {
        try {
          await adminApiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' })
          results.push({ id, ok: true })
        } catch (error) {
          results.push({ id, ok: false, error: error.message })
        }
      }
      return textResult({ results })
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'reorder_categories',
  {
    title: 'Reorder / reparent product categories',
    description:
      'Batch-update sort_order and/or parent_id for up to 200 categories at once. Call get_category_tree first to see current ids/structure and compute the new tuples.',
    inputSchema: reorderCategoriesInput,
  },
  async ({ updates }) => {
    try {
      const data = await adminApiRequest('/api/admin/categories/order', {
        method: 'PATCH',
        body: { updates },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Size guides ---

server.registerTool(
  'list_size_guides',
  {
    title: 'List size guides',
    description: 'List size guides with their ids, ready to assign to a category (default) or a product (override).',
    inputSchema: listSizeGuidesInput,
  },
  async ({ search }) => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const data = await adminApiRequest(`/api/admin/size-guides?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'get_size_guide',
  {
    title: 'Get size guide',
    description: 'Fetch a single size guide by id, including its full column/row table.',
    inputSchema: getSizeGuideInput,
  },
  async ({ id }) => {
    try {
      const all = await adminApiRequest('/api/admin/size-guides?per_page=50')
      const found = Array.isArray(all?.items) ? all.items.find((row) => row.id === id) : null
      if (!found) throw new Error('Size guide not found.')
      return textResult({ item: found })
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'create_size_guide',
  {
    title: 'Create a size guide',
    description:
      'Create a measurement chart (custom columns/rows) that can be set as a category default or attached to an individual product to override it. For an IN/CM toggle, use paired column keys like "chest_in"/"chest_cm" with unit_toggle: true.',
    inputSchema: createSizeGuideInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/size-guides', { method: 'POST', body: input })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_size_guide',
  {
    title: 'Update a size guide',
    description: "Update a size guide's name, columns, rows, unit toggle, how-to-measure, or notes. Only send fields you want changed.",
    inputSchema: updateSizeGuideInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/size-guides', { method: 'PATCH', body: input })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_size_guide',
  {
    title: 'Delete a size guide',
    description:
      'Permanently delete a size guide. Fails if it is still set as a category default or a product override — use update_category/update_product to unassign it first.',
    inputSchema: deleteSizeGuideInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/size-guides/${id}`, { method: 'DELETE' })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Shipping / logistics ---

server.registerTool(
  'get_shipping_settings',
  {
    title: 'Get shipping settings',
    description:
      'Fetch shipping configuration: the list of valid Nigerian states, per-city standard/express rates for one state (call with no `state` to see all valid state names plus rates for the first state), the flat worldwide (non-Nigeria) fee, and pickup locations. Call this before update_shipping_rates or update_worldwide_shipping_fee to see current values and valid state/city names.',
    inputSchema: getShippingSettingsInput,
  },
  async ({ state }) => {
    try {
      const params = new URLSearchParams()
      if (state) params.set('state', state)
      const data = await adminApiRequest(`/api/admin/logistics-settings?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_shipping_rates',
  {
    title: 'Update shipping rates for a Nigerian state',
    description:
      'Set standard/express delivery fees per city within one Nigerian state. Only the cities listed in `rates` are changed — other cities already saved for that state are left untouched. If a city omits `standard_eta_key`/`express_eta_key`, its existing ETA is preserved (falling back to a default only for a brand-new city). Call get_shipping_settings first to see the state\'s current rates and confirm valid city names.',
    inputSchema: updateShippingRatesInput,
  },
  async ({ state, rates }) => {
    try {
      const needsEtaLookup = rates.some((rate) => !rate.standard_eta_key || !rate.express_eta_key)
      let existingByCity = new Map()
      if (needsEtaLookup) {
        const params = new URLSearchParams({ state })
        const current = await adminApiRequest(`/api/admin/logistics-settings?${params.toString()}`)
        existingByCity = new Map(
          (current?.rates || []).map((row) => [String(row.city || '').toLowerCase(), row]),
        )
      }

      const data = await adminApiRequest('/api/admin/logistics-settings', {
        method: 'PATCH',
        body: {
          scope: 'nigeria',
          state,
          rates: rates.map((rate) => {
            const existing = existingByCity.get(String(rate.city || '').toLowerCase())
            return {
              city: rate.city,
              standardPrice: rate.standard_price,
              expressPrice: rate.express_price,
              standardEtaKey: rate.standard_eta_key || existing?.standardEtaKey || 'standard_1_3_days',
              expressEtaKey: rate.express_eta_key || existing?.expressEtaKey || 'express_2_24_hours',
            }
          }),
        },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_worldwide_shipping_fee',
  {
    title: 'Update the worldwide (non-Nigeria) shipping fee',
    description:
      'Set the single flat shipping fee (in USD) charged for orders shipping outside Nigeria. This is one platform-wide value, not per-country. If `eta_key` is omitted, the current ETA is preserved (not reset).',
    inputSchema: updateWorldwideShippingFeeInput,
  },
  async ({ fixed_price_usd, eta_key }) => {
    try {
      let resolvedEtaKey = eta_key
      if (!resolvedEtaKey) {
        const current = await adminApiRequest('/api/admin/logistics-settings?scope=worldwide')
        resolvedEtaKey = current?.worldwideSettings?.etaKey
      }
      const data = await adminApiRequest('/api/admin/logistics-settings', {
        method: 'PATCH',
        body: {
          scope: 'worldwide',
          fixedPriceUsd: fixed_price_usd,
          etaKey: resolvedEtaKey,
        },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Media library ---

server.registerTool(
  'list_media',
  {
    title: 'List media library',
    description: 'List uploaded product images/media, optionally filtered to unattached or stale items.',
    inputSchema: listMediaInput,
  },
  async ({ page, per_page, filter }) => {
    try {
      const params = new URLSearchParams()
      if (page) params.set('page', String(page))
      if (per_page) params.set('per_page', String(per_page))
      if (filter) params.set('filter', filter)
      const data = await adminApiRequest(`/api/admin/media?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'upload_media',
  {
    title: 'Upload product image',
    description:
      'Upload an image file from a local path into the media library, optionally attaching it directly to a product. Returns the new image id (use it in create_product/update_product image_ids or main_image_id).',
    inputSchema: uploadMediaInput,
  },
  async ({ file_path, product_id, alt_text, sort_order }) => {
    try {
      const fileBuffer = await readFile(file_path)
      const ext = file_path.slice(file_path.lastIndexOf('.')).toLowerCase()
      const mimeType = MIME_BY_EXT[ext]
      if (!mimeType) {
        throw new Error(`Unsupported image extension: ${ext}. Use png, jpg, jpeg, webp, or gif.`)
      }
      const formData = new FormData()
      formData.append('file', new Blob([fileBuffer], { type: mimeType }), basename(file_path))
      if (product_id) formData.append('product_id', product_id)
      if (alt_text) formData.append('alt_text', alt_text)
      if (sort_order !== undefined) formData.append('sort_order', String(sort_order))

      const data = await adminApiUpload('/api/admin/media/upload', formData)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_media',
  {
    title: 'Delete an image from the media library',
    description:
      'Permanently delete an uploaded image from the media library by its UUID (from list_media). Also removes the underlying storage object. If a product uses this image as its main image or a variation image, that reference is cleared automatically. This cannot be undone.',
    inputSchema: deleteMediaInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/media/${id}`, { method: 'DELETE' })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Orders ---

server.registerTool(
  'list_orders',
  {
    title: 'List orders',
    description: 'List customer orders with optional status filter and search.',
    inputSchema: listOrdersInput,
  },
  async ({ page, perPage, status, search }) => {
    try {
      const params = new URLSearchParams()
      if (page) params.set('page', String(page))
      if (perPage) params.set('perPage', String(perPage))
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const data = await adminApiRequest(`/api/admin/orders?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'get_order',
  {
    title: 'Get order',
    description: 'Fetch full details for a single order, including items, customer, and shipping address.',
    inputSchema: getOrderInput,
  },
  async ({ orderId }) => {
    try {
      const data = await adminApiRequest(`/api/admin/orders/${orderId}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_order_status',
  {
    title: 'Update order status',
    description: 'Change an order status (e.g. mark as ready_to_ship, delivered, cancelled). Notifies the customer.',
    inputSchema: updateOrderStatusInput,
  },
  async ({ orderId, status }) => {
    try {
      const data = await adminApiRequest('/api/admin/orders', {
        method: 'PATCH',
        body: { orderId, status },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Vendors ---

server.registerTool(
  'list_vendors',
  {
    title: 'List vendors',
    description: 'List vendors/brands with their vendor_id (needed for storefront tools) and brand slug.',
    inputSchema: listVendorsInput,
  },
  async ({ page, per_page, search }) => {
    try {
      const params = new URLSearchParams()
      if (page) params.set('page', String(page))
      if (per_page) params.set('per_page', String(per_page))
      if (search) params.set('search', search)
      const data = await adminApiRequest(`/api/admin/vendors?${params.toString()}`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Vendor storefront custom sections/banners ---

const randomBlockId = () => `custom_html_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

server.registerTool(
  'get_vendor_storefront',
  {
    title: 'Get vendor storefront blocks',
    description:
      'Fetch a vendor storefront current banner/section blocks (banner_grid and custom_html), with their ids. Use before editing to see what already exists.',
    inputSchema: getVendorStorefrontInput,
  },
  async ({ vendor_id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`)
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'upsert_vendor_custom_html_section',
  {
    title: 'Create or update a vendor storefront custom HTML banner/section',
    description:
      'Add a new custom HTML/CSS/JS banner or section to a vendor storefront, or update an existing one by block_id. HTML is sanitized server-side (scripts/event handlers/iframes stripped) before saving. Inline <style> attributes and CSS are allowed. Call get_vendor_storefront first to see existing block ids.',
    inputSchema: upsertVendorCustomHtmlSectionInput,
  },
  async ({ vendor_id, block_id, html, js, mobile_enabled, mobile_html, mobile_js }) => {
    try {
      const existing = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`)
      const blocks = Array.isArray(existing?.item?.storefront_blocks)
        ? existing.item.storefront_blocks
        : []

      const config = {
        html,
        js: js || '',
        mobileEnabled: Boolean(mobile_enabled),
        mobileHtml: mobile_html || '',
        mobileJs: mobile_js || '',
      }

      let nextBlocks
      if (block_id && blocks.some((block) => block.id === block_id)) {
        nextBlocks = blocks.map((block) =>
          block.id === block_id ? { ...block, type: 'custom_html', config } : block,
        )
      } else {
        nextBlocks = [...blocks, { id: block_id || randomBlockId(), type: 'custom_html', config }]
      }

      const data = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`, {
        method: 'PATCH',
        body: { storefront_blocks: nextBlocks },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_vendor_storefront_block',
  {
    title: 'Delete a vendor storefront block',
    description: 'Remove a banner_grid or custom_html block from a vendor storefront by its block_id.',
    inputSchema: deleteVendorStorefrontBlockInput,
  },
  async ({ vendor_id, block_id }) => {
    try {
      const existing = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`)
      const blocks = Array.isArray(existing?.item?.storefront_blocks)
        ? existing.item.storefront_blocks
        : []
      const nextBlocks = blocks.filter((block) => block.id !== block_id)

      const data = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`, {
        method: 'PATCH',
        body: { storefront_blocks: nextBlocks },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

// --- Homepage custom sections/blocks ---

const randomHomeBlockId = () => `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

server.registerTool(
  'get_home_blocks',
  {
    title: 'Get homepage blocks',
    description:
      'Fetch the storefront homepage current section blocks (banner_grid, hero_slider, featured_strip, hotspot, logo_grid, product_catalog, browse_cards, custom_html), with their ids. Use before editing to see what already exists.',
    inputSchema: getHomeBlocksInput,
  },
  async () => {
    try {
      const data = await adminApiRequest('/api/admin/home')
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'upsert_home_custom_html_section',
  {
    title: 'Create or update a homepage custom HTML section',
    description:
      'Add a new custom HTML/CSS/JS section to the storefront homepage, or update an existing one by block_id. HTML is sanitized server-side (scripts/event handlers/iframes stripped) before saving. Inline <style> attributes and CSS are allowed. Call get_home_blocks first to see existing block ids. Only touches custom_html blocks; other homepage block types are left as-is.',
    inputSchema: upsertHomeCustomHtmlSectionInput,
  },
  async ({ block_id, html, js, mobile_enabled, mobile_html, mobile_js }) => {
    try {
      const existing = await adminApiRequest('/api/admin/home')
      const blocks = Array.isArray(existing?.item?.home_blocks) ? existing.item.home_blocks : []

      const config = {
        html,
        js: js || '',
        mobile: {
          enabled: Boolean(mobile_enabled),
          html: mobile_html || '',
          js: mobile_js || '',
        },
      }

      let nextBlocks
      if (block_id && blocks.some((block) => block.id === block_id)) {
        nextBlocks = blocks.map((block) =>
          block.id === block_id ? { ...block, type: 'custom_html', config } : block,
        )
      } else {
        nextBlocks = [...blocks, { id: block_id || randomHomeBlockId(), type: 'custom_html', config }]
      }

      const data = await adminApiRequest('/api/admin/home', {
        method: 'PUT',
        body: { home_blocks: nextBlocks },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'delete_home_block',
  {
    title: 'Delete a homepage block',
    description: 'Remove any block (banner_grid, custom_html, etc.) from the storefront homepage by its block_id.',
    inputSchema: deleteHomeBlockInput,
  },
  async ({ block_id }) => {
    try {
      const existing = await adminApiRequest('/api/admin/home')
      const blocks = Array.isArray(existing?.item?.home_blocks) ? existing.item.home_blocks : []
      const nextBlocks = blocks.filter((block) => block.id !== block_id)

      const data = await adminApiRequest('/api/admin/home', {
        method: 'PUT',
        body: { home_blocks: nextBlocks },
      })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
