import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
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
} from './schemas'

const storefrontBaseUrl = () => (process.env.APP_BASE_URL || '').replace(/\/+$/, '')

const withStorefrontUrl = (payload: any) => {
  const slug = payload?.item?.slug || payload?.slug
  if (!slug) return payload
  const base = storefrontBaseUrl()
  const storefront_url = base ? `${base}/product/${slug}` : undefined
  if (!storefront_url) return payload
  if (payload?.item) return { ...payload, item: { ...payload.item, storefront_url } }
  return { ...payload, storefront_url }
}

const textResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
})

const errorResult = (error: unknown) => ({
  content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
  isError: true,
})

const adminApiRequest = async (
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
) => {
  const baseUrl = (process.env.MCP_SELF_BASE_URL || process.env.APP_BASE_URL || '').replace(/\/+$/, '')
  const token = process.env.MCP_ADMIN_API_TOKEN
  if (!baseUrl) throw new Error('MCP_SELF_BASE_URL is not configured.')
  if (!token) throw new Error('MCP_ADMIN_API_TOKEN is not configured.')

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload: any
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`)
  }
  return payload
}

/**
 * Builds a fresh McpServer per request. Mirrors mcp-server/src/index.js's tool
 * set (including shipping tools), except upload_media here takes a URL/base64
 * (not a local file path, which has no meaning for a remote caller) — keep
 * the two in sync by hand when tools change.
 */
export function createOcprimesMcpServer() {
  const server = new McpServer({ name: 'ocprimes-admin', version: '0.1.0' })

  server.registerTool(
    'list_products',
    {
      title: 'List products',
      description: 'List store products with optional search, status filter, and pagination.',
      inputSchema: listProductsInput,
    },
    async ({ page, per_page, status, search }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (per_page) params.set('per_page', String(per_page))
        if (status) params.set('status', status)
        if (search) params.set('search', search)
        return textResult(await adminApiRequest(`/api/admin/products?${params.toString()}`))
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
    async ({ id }: any) => {
      try {
        return textResult(withStorefrontUrl(await adminApiRequest(`/api/admin/products/${id}`)))
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
    async (input: any) => {
      try {
        return textResult(
          withStorefrontUrl(await adminApiRequest('/api/admin/products', { method: 'POST', body: input })),
        )
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
    async ({ id, ...rest }: any) => {
      try {
        return textResult(
          withStorefrontUrl(await adminApiRequest(`/api/admin/products/${id}`, { method: 'PATCH', body: rest })),
        )
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
    async ({ id }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/products/${id}`, { method: 'DELETE' }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  const registerTaxonomyTools = (name: string, path: string) => {
    server.registerTool(
      `list_${name}`,
      {
        title: `List ${name}`,
        description: `List ${name} with their UUIDs, needed to assign them to products.`,
        inputSchema: listTaxonomyInput,
      },
      async ({ search }: any) => {
        try {
          const params = new URLSearchParams()
          if (search) params.set('search', search)
          return textResult(await adminApiRequest(`${path}?${params.toString()}`))
        } catch (error) {
          return errorResult(error)
        }
      },
    )
  }
  registerTaxonomyTools('categories', '/api/admin/categories')
  registerTaxonomyTools('tags', '/api/admin/tags')
  registerTaxonomyTools('brands', '/api/admin/brands')

  server.registerTool(
    'get_category_tree',
    {
      title: 'Get product category tree',
      description:
        'Fetch the full nested product category tree with parent/child relationships, ids, slugs, and sort_order. Use before creating/editing/deleting/reordering categories to see current structure.',
      inputSchema: getCategoryTreeInput,
    },
    async ({ search, limit }: any) => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (limit) params.set('limit', String(limit))
        return textResult(await adminApiRequest(`/api/admin/categories/tree?${params.toString()}`))
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
    async (input: any) => {
      try {
        return textResult(await adminApiRequest('/api/admin/categories', { method: 'POST', body: input }))
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
    async (input: any) => {
      try {
        return textResult(await adminApiRequest('/api/admin/categories', { method: 'PATCH', body: input }))
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
    async ({ id }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  // /api/admin/categories/tree returns a flat list with parent_id — compute
  // each node's depth by walking parent_id chains so bulk delete can order
  // deepest-first (leaves before their ancestors).
  const computeDepths = (flatItems: any[]) => {
    const byId = new Map<string, any>()
    for (const item of flatItems || []) {
      if (item?.id) byId.set(item.id, item)
    }
    const depths = new Map<string, number>()
    const depthOf = (id: string, guard = new Set<string>()): number => {
      if (depths.has(id)) return depths.get(id)!
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
    async ({ ids }: any) => {
      try {
        const tree = await adminApiRequest('/api/admin/categories/tree?limit=2000')
        const depths = computeDepths(tree?.items || [])
        const orderedIds = [...ids].sort((a, b) => (depths.get(b) ?? 0) - (depths.get(a) ?? 0))

        const results: Array<{ id: string; ok: boolean; error?: string }> = []
        for (const id of orderedIds) {
          try {
            await adminApiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' })
            results.push({ id, ok: true })
          } catch (error) {
            results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
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
    async ({ updates }: any) => {
      try {
        return textResult(
          await adminApiRequest('/api/admin/categories/order', { method: 'PATCH', body: { updates } }),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'list_size_guides',
    {
      title: 'List size guides',
      description: 'List size guides with their ids, ready to assign to a category (default) or a product (override).',
      inputSchema: listSizeGuidesInput,
    },
    async ({ search }: any) => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        return textResult(await adminApiRequest(`/api/admin/size-guides?${params.toString()}`))
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
    async ({ id }: any) => {
      try {
        const all = await adminApiRequest('/api/admin/size-guides?per_page=50')
        const found = Array.isArray(all?.items) ? all.items.find((row: any) => row.id === id) : null
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
    async (input: any) => {
      try {
        return textResult(await adminApiRequest('/api/admin/size-guides', { method: 'POST', body: input }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'update_size_guide',
    {
      title: 'Update a size guide',
      description: 'Update a size guide\'s name, columns, rows, unit toggle, how-to-measure, or notes. Only send fields you want changed.',
      inputSchema: updateSizeGuideInput,
    },
    async (input: any) => {
      try {
        return textResult(await adminApiRequest('/api/admin/size-guides', { method: 'PATCH', body: input }))
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
    async ({ id }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/size-guides/${id}`, { method: 'DELETE' }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'list_media',
    {
      title: 'List media library',
      description:
        'List uploaded product images/media, optionally filtered to unattached or stale items. Each item includes the site\'s uuid (id) plus, when the image came from the Alxora Workplace app, local_image_id (its IMG-... id) and source_batch_id — use these to match an image back to what the app shows.',
      inputSchema: listMediaInput,
    },
    async ({ page, per_page, filter }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (per_page) params.set('per_page', String(per_page))
        if (filter) params.set('filter', filter)
        return textResult(await adminApiRequest(`/api/admin/media?${params.toString()}`))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'upload_media',
    {
      title: 'Upload an image',
      description:
        'Upload an image into the media library from a public https URL or base64 image data, optionally attached directly to a product. Returns the new image id — use it in create_product/update_product image_ids, main_image_id, or a variation\'s image_id (to link that photo to a specific color/size).',
      inputSchema: uploadMediaInput,
    },
    async ({ image_url, image_base64, file_name, product_id, alt_text, sort_order }: any) => {
      try {
        return textResult(
          await adminApiRequest('/api/admin/media/upload-remote', {
            method: 'POST',
            body: { image_url, image_base64, file_name, product_id, alt_text, sort_order },
          }),
        )
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
    async ({ id }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/media/${id}`, { method: 'DELETE' }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'List customer orders with optional status filter and search.',
      inputSchema: listOrdersInput,
    },
    async ({ page, perPage, status, search }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (perPage) params.set('perPage', String(perPage))
        if (status) params.set('status', status)
        if (search) params.set('search', search)
        return textResult(await adminApiRequest(`/api/admin/orders?${params.toString()}`))
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
    async ({ orderId }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/orders/${orderId}`))
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
    async ({ orderId, status }: any) => {
      try {
        return textResult(
          await adminApiRequest('/api/admin/orders', { method: 'PATCH', body: { orderId, status } }),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'list_vendors',
    {
      title: 'List vendors',
      description: 'List vendors/brands with their vendor_id (needed for storefront tools) and brand slug.',
      inputSchema: listVendorsInput,
    },
    async ({ page, per_page, search }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (per_page) params.set('per_page', String(per_page))
        if (search) params.set('search', search)
        return textResult(await adminApiRequest(`/api/admin/vendors?${params.toString()}`))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'get_vendor_storefront',
    {
      title: 'Get vendor storefront blocks',
      description:
        'Fetch a vendor storefront current banner/section blocks (banner_grid and custom_html), with their ids. Use before editing to see what already exists.',
      inputSchema: getVendorStorefrontInput,
    },
    async ({ vendor_id }: any) => {
      try {
        return textResult(await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  const randomBlockId = () =>
    `custom_html_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  server.registerTool(
    'upsert_vendor_custom_html_section',
    {
      title: 'Create or update a vendor storefront custom HTML banner/section',
      description:
        'Add a new custom HTML/CSS/JS banner or section to a vendor storefront, or update an existing one by block_id. HTML is sanitized server-side (scripts/event handlers/iframes stripped) before saving. Inline <style> attributes and CSS are allowed. Call get_vendor_storefront first to see existing block ids.',
      inputSchema: upsertVendorCustomHtmlSectionInput,
    },
    async ({ vendor_id, block_id, html, js, mobile_enabled, mobile_html, mobile_js }: any) => {
      try {
        const existing = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`)
        const blocks = Array.isArray(existing?.item?.storefront_blocks) ? existing.item.storefront_blocks : []

        const config = {
          html,
          js: js || '',
          mobileEnabled: Boolean(mobile_enabled),
          mobileHtml: mobile_html || '',
          mobileJs: mobile_js || '',
        }

        let nextBlocks
        if (block_id && blocks.some((block: any) => block.id === block_id)) {
          nextBlocks = blocks.map((block: any) =>
            block.id === block_id ? { ...block, type: 'custom_html', config } : block,
          )
        } else {
          nextBlocks = [...blocks, { id: block_id || randomBlockId(), type: 'custom_html', config }]
        }

        return textResult(
          await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`, {
            method: 'PATCH',
            body: { storefront_blocks: nextBlocks },
          }),
        )
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
    async ({ vendor_id, block_id }: any) => {
      try {
        const existing = await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`)
        const blocks = Array.isArray(existing?.item?.storefront_blocks) ? existing.item.storefront_blocks : []
        const nextBlocks = blocks.filter((block: any) => block.id !== block_id)

        return textResult(
          await adminApiRequest(`/api/admin/vendors/${vendor_id}/storefront-blocks`, {
            method: 'PATCH',
            body: { storefront_blocks: nextBlocks },
          }),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

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
        return textResult(await adminApiRequest('/api/admin/home'))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  const randomHomeBlockId = () =>
    `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  server.registerTool(
    'upsert_home_custom_html_section',
    {
      title: 'Create or update a homepage custom HTML section',
      description:
        'Add a new custom HTML/CSS/JS section to the storefront homepage, or update an existing one by block_id. HTML is sanitized server-side (scripts/event handlers/iframes stripped) before saving. Inline <style> attributes and CSS are allowed. Call get_home_blocks first to see existing block ids. Only touches custom_html blocks; other homepage block types are left as-is.',
      inputSchema: upsertHomeCustomHtmlSectionInput,
    },
    async ({ block_id, html, js, mobile_enabled, mobile_html, mobile_js }: any) => {
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
        if (block_id && blocks.some((block: any) => block.id === block_id)) {
          nextBlocks = blocks.map((block: any) =>
            block.id === block_id ? { ...block, type: 'custom_html', config } : block,
          )
        } else {
          nextBlocks = [...blocks, { id: block_id || randomHomeBlockId(), type: 'custom_html', config }]
        }

        return textResult(
          await adminApiRequest('/api/admin/home', { method: 'PUT', body: { home_blocks: nextBlocks } }),
        )
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
    async ({ block_id }: any) => {
      try {
        const existing = await adminApiRequest('/api/admin/home')
        const blocks = Array.isArray(existing?.item?.home_blocks) ? existing.item.home_blocks : []
        const nextBlocks = blocks.filter((block: any) => block.id !== block_id)

        return textResult(
          await adminApiRequest('/api/admin/home', { method: 'PUT', body: { home_blocks: nextBlocks } }),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'get_shipping_settings',
    {
      title: 'Get shipping settings',
      description:
        'Fetch shipping configuration: the list of valid Nigerian states, per-city standard/express rates for one state (call with no `state` to see all valid state names plus rates for the first state), the flat worldwide (non-Nigeria) fee, and pickup locations. Call this before update_shipping_rates or update_worldwide_shipping_fee to see current values and valid state/city names.',
      inputSchema: getShippingSettingsInput,
    },
    async ({ state }: any) => {
      try {
        const params = new URLSearchParams()
        if (state) params.set('state', state)
        return textResult(await adminApiRequest(`/api/admin/logistics-settings?${params.toString()}`))
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
    async ({ state, rates }: any) => {
      try {
        const needsEtaLookup = rates.some((rate: any) => !rate.standard_eta_key || !rate.express_eta_key)
        let existingByCity = new Map<string, any>()
        if (needsEtaLookup) {
          const params = new URLSearchParams({ state })
          const current = await adminApiRequest(`/api/admin/logistics-settings?${params.toString()}`)
          existingByCity = new Map(
            (current?.rates || []).map((row: any) => [String(row.city || '').toLowerCase(), row]),
          )
        }

        const data = await adminApiRequest('/api/admin/logistics-settings', {
          method: 'PATCH',
          body: {
            scope: 'nigeria',
            state,
            rates: rates.map((rate: any) => {
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
    async ({ fixed_price_usd, eta_key }: any) => {
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

  return server
}
