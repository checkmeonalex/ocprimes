import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  listProductsInput,
  getProductInput,
  createProductInput,
  updateProductInput,
  deleteProductInput,
  listMediaInput,
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

/**
 * Vendor-scoped variant of adminApiRequest (see server.ts) — sends the
 * caller's own short-lived signed identity token (mcpuser_..., minted by
 * /api/mcp for THIS specific vendor) instead of the static
 * MCP_ADMIN_API_TOKEN. The target /api/admin/* routes derive vendor_id
 * from that resolved identity server-side (see product-route.ts), so every
 * call here is automatically scoped to the calling vendor's own rows —
 * there is no vendor_id parameter to pass or trust from the tool input.
 */
const buildVendorApiRequest = (userToken: string) => {
  return async (path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}) => {
    const baseUrl = (process.env.MCP_SELF_BASE_URL || process.env.APP_BASE_URL || '').replace(/\/+$/, '')
    if (!baseUrl) throw new Error('MCP_SELF_BASE_URL is not configured.')

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
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
}

/**
 * Builds a fresh McpServer scoped to one vendor's own store. userToken is a
 * freshly-minted mcpuser_... token (see mint-mcp-user-token.ts) tied to the
 * specific vendor who authenticated this MCP connection — every tool call
 * in this server executes as that vendor, hitting the exact same
 * self-scoping REST routes the vendor dashboard UI uses (vendor_id is
 * always server-derived from the caller's identity, never client-supplied
 * — see product-route.ts's createProduct/updateProduct). This is
 * deliberately a small subset of createOcprimesMcpServer()'s admin tools:
 * only what a vendor could already do from their own dashboard.
 */
export function createOcprimesVendorMcpServer(userToken: string) {
  const server = new McpServer({ name: 'ocprimes-vendor', version: '0.1.0' })
  const vendorApiRequest = buildVendorApiRequest(userToken)

  server.registerTool(
    'list_products',
    {
      title: 'List my products',
      description: 'List products in your own store, with optional search, status filter, and pagination.',
      inputSchema: listProductsInput,
    },
    async ({ page, per_page, status, search }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (per_page) params.set('per_page', String(per_page))
        if (status) params.set('status', status)
        if (search) params.set('search', search)
        return textResult(await vendorApiRequest(`/api/admin/products?${params.toString()}`))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'get_product',
    {
      title: 'Get my product',
      description: 'Fetch a single product from your store by its UUID. Response includes storefront_url.',
      inputSchema: getProductInput,
    },
    async ({ id }: any) => {
      try {
        return textResult(withStorefrontUrl(await vendorApiRequest(`/api/admin/products/${id}`)))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'create_product',
    {
      title: 'Create product in my store',
      description:
        'Create a new product in your own store. It is automatically attributed to your store — you cannot create products for another vendor. condition_check, packaging_style, and return_policy are required enums; category_ids/tag_ids/brand_ids/image_ids reference existing UUIDs. Response includes storefront_url.',
      inputSchema: createProductInput,
    },
    async (input: any) => {
      try {
        return textResult(
          withStorefrontUrl(await vendorApiRequest('/api/admin/products', { method: 'POST', body: input })),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'update_product',
    {
      title: 'Update my product',
      description:
        'Update fields on a product in your own store. Only send fields you want changed. Fails if the product does not belong to your store.',
      inputSchema: updateProductInput,
    },
    async ({ id, ...rest }: any) => {
      try {
        return textResult(
          withStorefrontUrl(await vendorApiRequest(`/api/admin/products/${id}`, { method: 'PATCH', body: rest })),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'delete_product',
    {
      title: 'Delete my product',
      description: 'Permanently delete a product from your own store by its UUID. This cannot be undone.',
      inputSchema: deleteProductInput,
    },
    async ({ id }: any) => {
      try {
        return textResult(await vendorApiRequest(`/api/admin/products/${id}`, { method: 'DELETE' }))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'list_media',
    {
      title: 'List my media library',
      description: 'List images/media you own or that are attached to your own products, with pagination.',
      inputSchema: listMediaInput,
    },
    async ({ page, per_page, filter }: any) => {
      try {
        const params = new URLSearchParams()
        if (page) params.set('page', String(page))
        if (per_page) params.set('per_page', String(per_page))
        if (filter) params.set('filter', filter)
        return textResult(await vendorApiRequest(`/api/admin/media?${params.toString()}`))
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  return server
}
