import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'

// Thin, stateless relay for the Alxora Workplace app's product-import
// scraping pipeline (Firecrawl / Zyte API / Bright Data). These vendors
// don't send CORS headers permitting arbitrary browser origins, so a
// direct call from Expo web fails at the preflight stage — this route
// exists purely to get around that by making the same call server-to-
// server, where CORS doesn't apply. It does NOT store any API key: the
// app sends its own key (from its own Settings) on every request, this
// route forwards it and returns the vendor's response unmodified. Native
// app builds don't strictly need this (no CORS there), but route through
// it anyway for one consistent code path.
const bodySchema = z.object({
  service: z.enum(['firecrawl', 'zyte', 'brightdata']),
  apiKey: z.string().min(1),
  url: z.string().url(),
  // Bright Data's Web Unlocker API requires a zone name in addition to
  // the API key — irrelevant for the other two services.
  zone: z.string().optional(),
})

function firecrawlRequest(apiKey: string, targetUrl: string) {
  return fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    }),
  })
}

function zyteRequest(apiKey: string, targetUrl: string) {
  // Zyte uses HTTP Basic auth: API key as username, empty password.
  const basic = Buffer.from(`${apiKey}:`).toString('base64')
  return fetch('https://api.zyte.com/v1/extract', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      product: true,
      // extractFrom: "httpResponseBody" (a prior version of this route)
      // skips JS rendering entirely — fine for simple server-rendered
      // pages, but silently thin/wrong on JS-heavy ones like AliExpress
      // (price, full image gallery, and variants only appear after JS
      // runs). "browserHtml" renders with a headless browser first, then
      // runs product extraction against the real DOM — this is also
      // Zyte's own documented default when extractFrom is omitted, so
      // being explicit here just makes that intent clear rather than
      // relying on an unstated default. Costs more per request than
      // httpResponseBody, but correctness matters more than the delta
      // for a product-import feature.
      productOptions: { extractFrom: 'browserHtml' },
    }),
  })
}

function brightDataRequest(apiKey: string, targetUrl: string, zone: string) {
  return fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone,
      url: targetUrl,
      format: 'raw',
      method: 'GET',
    }),
  })
}

export async function POST(request: NextRequest) {
  const { canManageCatalog, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid request.', 400)
  }
  const { service, apiKey, url, zone } = parsed.data

  try {
    let upstream: Response
    if (service === 'firecrawl') {
      upstream = await firecrawlRequest(apiKey, url)
    } else if (service === 'zyte') {
      upstream = await zyteRequest(apiKey, url)
    } else {
      if (!zone) return jsonError('Bright Data requires a zone name.', 400)
      upstream = await brightDataRequest(apiKey, url, zone)
    }

    const text = await upstream.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      // Bright Data's format:"raw" returns a plain HTML string, not JSON.
      json = { raw: text }
    }

    if (!upstream.ok) {
      return jsonError(
        `${service} request failed (${upstream.status}).`,
        upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
      )
    }

    return jsonOk({ service, result: json })
  } catch (error) {
    console.error('Scrape relay failed:', error)
    return jsonError('Relay request failed.', 502)
  }
}
