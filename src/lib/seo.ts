import { BRAND_NAME, BRAND_TAGLINE, BRAND_SEARCH_DESCRIPTION } from './brand'

const FALLBACK_SITE_URL = 'https://alxora.com'

export const getSiteUrl = () => {
  const rawValue = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL
  return String(rawValue || FALLBACK_SITE_URL).trim().replace(/\/+$/, '')
}

export const SITE_URL = getSiteUrl()

export const DEFAULT_SEO_TITLE = `${BRAND_NAME} | ${BRAND_TAGLINE}`

export const DEFAULT_SEO_DESCRIPTION = BRAND_SEARCH_DESCRIPTION

export const PUBLIC_STATIC_ROUTES = [
  '',
  '/products',
  '/help-center',
  '/privacy-policy',
]

