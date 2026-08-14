# OCPrimes Admin MCP Server

Lets Claude manage the OCPrimes store directly: products (create/edit/delete, variations,
categories/tags/brands), the media library, and orders.

It is a thin adapter — every tool call hits the real `/api/admin/*` routes in the main app
over HTTP, authenticated with a bearer token instead of a browser session. All validation,
business rules, and database access stay in the main app; this server has no direct DB access.

## How it authenticates

The main app's `middleware.ts` and `requireAdmin`/`requireDashboardUser` helpers accept
`Authorization: Bearer <MCP_ADMIN_API_TOKEN>` as equivalent to a logged-in admin session
(see `src/lib/auth/mcp-token.ts`). Treat that token like a root credential — anyone who has
it has full admin API access.

## Setup

1. In the main app's `.env.local` (already done for you), confirm:
   - `MCP_ADMIN_API_TOKEN` — a long random secret (already generated).
   - `MCP_SERVICE_USER_ID` — **must be set** to a real `auth.users` UUID (your admin account).
     Products created via MCP use this as `created_by`. Find it in Supabase Dashboard →
     Authentication → Users → your admin email → copy the UUID.
2. Copy `mcp-server/.env.example` to `mcp-server/.env` and fill in:
   - `MCP_ADMIN_API_TOKEN` — same value as the main app's.
   - `OCPRIMES_API_BASE_URL` — `http://localhost:3000` for local dev, or your production URL.
3. Install deps: `cd mcp-server && npm install`.
4. Restart the Next.js dev server (`npm run dev` at repo root) so the new env vars and
   middleware/auth changes load.

## Wiring into Claude Code

Add to your Claude Code MCP config (`claude mcp add` or the settings file):

```json
{
  "mcpServers": {
    "ocprimes-admin": {
      "command": "node",
      "args": ["/absolute/path/to/ocprimes/mcp-server/src/index.js"],
      "env": {
        "MCP_ADMIN_API_TOKEN": "<same token as .env.local>",
        "OCPRIMES_API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or with the CLI:

```bash
claude mcp add ocprimes-admin \
  --env MCP_ADMIN_API_TOKEN=<token> \
  --env OCPRIMES_API_BASE_URL=http://localhost:3000 \
  -- node /absolute/path/to/ocprimes/mcp-server/src/index.js
```

## Wiring into Claude Desktop

Add the same shape to `claude_desktop_config.json` under `mcpServers`.

## Tools

| Tool | Purpose |
|---|---|
| `list_products` / `get_product` | Browse/inspect products |
| `create_product` / `update_product` | Create or edit a product, including a `variations` array for size/color combos |
| `delete_product` | Permanently delete a product |
| `list_categories` / `list_tags` / `list_brands` | Look up UUIDs to pass into `category_ids`/`tag_ids`/`brand_ids` |
| `list_media` / `upload_media` | Browse the media library, or upload a local image file (returns an image id for `image_ids`/`main_image_id`) |
| `fetch_image` | Fetch an https image URL (e.g. from `list_media`) and view it directly |
| `list_orders` / `get_order` | Browse and inspect customer orders |
| `update_order_status` | Change an order's status (notifies the customer) |
| `list_vendors` | List vendors with their `vendor_id` (needed for storefront tools) |
| `get_vendor_storefront` | Read a vendor's current storefront banner/section blocks |
| `upsert_vendor_custom_html_section` | Create or update a custom HTML/CSS/JS banner/section on a vendor's storefront |
| `delete_vendor_storefront_block` | Remove a banner/section block from a vendor's storefront |

## Notes

- `upload_media` reads a file from a local path on the machine running the MCP server (via
  `readFile`), then multipart-uploads it — same as the admin dashboard's upload flow.
- Deleting products/orders-status changes are irreversible or customer-visible; the model
  will call them directly once instructed, so keep the token scoped to trusted use.
- Vendor storefront custom HTML is sanitized server-side before saving (scripts, event
  handlers, iframes, forms, and dangerous URL schemes are stripped — see
  `src/utils/sanitize-custom-html.ts`). `<style>` attributes and inline CSS are allowed.
  It renders live on the vendor's public storefront page, so treat it as publishing content,
  not a draft.
- To revoke access at any time, rotate `MCP_ADMIN_API_TOKEN` in the main app's `.env.local`
  and restart the app.
