import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  listProductsInput,
  getProductInput,
  createProductInput,
  updateProductInput,
  deleteProductInput,
  listTaxonomyInput,
  uploadMediaInput,
  listMediaInput,
  listOrdersInput,
  getOrderInput,
  updateOrderStatusInput,
  listVendorsInput,
  getVendorStorefrontInput,
  upsertVendorCustomHtmlSectionInput,
  deleteVendorStorefrontBlockInput,
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
 * set, except upload_media here takes a URL/base64 (not a local file path,
 * which has no meaning for a remote caller) — keep the two in sync by hand
 * when tools change.
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
    'list_media',
    {
      title: 'List media library',
      description: 'List uploaded product images/media, optionally filtered to unattached or stale items.',
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

  return server
}
