import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'

// Thin, stateless relay for the Alxora Workplace app's product-import
// scraping pipeline (Firecrawl / Zyte API / Oxylabs). These vendors
// don't send CORS headers permitting arbitrary browser origins, so a
// direct call from Expo web fails at the preflight stage — this route
// exists purely to get around that by making the same call server-to-
// server, where CORS doesn't apply. It does NOT store any API key: the
// app sends its own key (from its own Settings) on every request, this
// route forwards it and returns the vendor's response unmodified. Native
// app builds don't strictly need this (no CORS there), but route through
// it anyway for one consistent code path.
const bodySchema = z.object({
  service: z.enum(['firecrawl', 'zyte', 'oxylabs']),
  apiKey: z.string().min(1),
  url: z.string().url(),
  // Oxylabs' Web Scraper API authenticates with a username + password
  // pair (Basic auth), not a single bearer key — apiKey carries the
  // username, password carries the password. Irrelevant for the other
  // two services.
  password: z.string().optional(),
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
      // "product" is Firecrawl's purpose-built, deterministic product
      // extractor (reads JSON-LD/schema.org/embedded state — no LLM, no
      // hallucination risk) and is the primary source for title/price/
      // description/variants/images. "images" is a plain deterministic
      // list of every image URL on the page, kept as a supplement/
      // fallback for galleries the structured extractor misses. "html"
      // is kept too — some sites (verified on Temu) lazy-load gallery
      // images as CSS background-image / data-src attributes rather than
      // plain <img src>, which Firecrawl's own "images" format also
      // misses; the app scans this raw HTML as a last-resort supplement
      // for exactly that case. "markdown" stays as a text fallback.
      //
      // onlyMainContent: false — the default (true) applies a
      // headers/nav/footer content filter that was found to also strip
      // out product image galleries/carousels on real pages (verified:
      // a Jumia scrape came back with the page's generic meta
      // description and zero images with onlyMainContent left at its
      // default). Full page needed so nothing product-relevant gets
      // filtered out as "chrome".
      formats: ['markdown', 'html', 'images', 'product'],
      onlyMainContent: false,
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
      // Raw rendered HTML alongside the structured product extraction —
      // some sites (verified on Temu) lazy-load gallery images as CSS
      // background-image/data-src rather than plain <img src>, which
      // Zyte's own product.images array can miss; the app scans this as
      // a last-resort image supplement, same as it does for Firecrawl.
      browserHtml: true,
    }),
  })
}

function oxylabsRequest(username: string, password: string, targetUrl: string) {
  // Oxylabs' Realtime Web Scraper API — source: "universal" works against
  // any public site, render: "html" runs a headless browser first so
  // JS-heavy pages (React/Next storefronts, lazy-loaded galleries) come
  // back fully rendered rather than the pre-JS server HTML. Response body
  // is { results: [{ content: "<html>...</html>", ... }] } — the raw
  // rendered HTML, same shape the app's generic HTML fallback parser
  // already expects from Bright Data's old format:"raw" response.
  const basic = Buffer.from(`${username}:${password}`).toString('base64')
  return fetch('https://realtime.oxylabs.io/v1/queries', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'universal',
      url: targetUrl,
      render: 'html',
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
  const { service, apiKey, url, password } = parsed.data

  try {
    let upstream: Response
    if (service === 'firecrawl') {
      upstream = await firecrawlRequest(apiKey, url)
    } else if (service === 'zyte') {
      upstream = await zyteRequest(apiKey, url)
    } else {
      if (!password) return jsonError('Oxylabs requires a password in addition to the username.', 400)
      upstream = await oxylabsRequest(apiKey, password, url)
    }

    const text = await upstream.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      // Defensive fallback — every current vendor (Firecrawl, Zyte,
      // Oxylabs) returns real JSON, but keep this so a non-JSON response
      // still surfaces as usable raw HTML instead of a hard parse error.
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
