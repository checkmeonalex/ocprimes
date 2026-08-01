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
  uploadMediaInput,
  listMediaInput,
  listOrdersInput,
  getOrderInput,
  updateOrderStatusInput,
  listVendorsInput,
  getVendorStorefrontInput,
  upsertVendorCustomHtmlSectionInput,
  deleteVendorStorefrontBlockInput,
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
    description: 'Fetch a single product by its UUID.',
    inputSchema: getProductInput,
  },
  async ({ id }) => {
    try {
      const data = await adminApiRequest(`/api/admin/products/${id}`)
      return textResult(data)
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
      'Create a new product. condition_check, packaging_style, and return_policy are required enums; category_ids/tag_ids/brand_ids/image_ids reference existing UUIDs.',
    inputSchema: createProductInput,
  },
  async (input) => {
    try {
      const data = await adminApiRequest('/api/admin/products', { method: 'POST', body: input })
      return textResult(data)
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  'update_product',
  {
    title: 'Update product',
    description: 'Update fields on an existing product. Only send fields you want changed.',
    inputSchema: updateProductInput,
  },
  async ({ id, ...rest }) => {
    try {
      const data = await adminApiRequest(`/api/admin/products/${id}`, { method: 'PATCH', body: rest })
      return textResult(data)
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

const transport = new StdioServerTransport()
await server.connect(transport)
