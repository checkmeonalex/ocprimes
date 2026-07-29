import 'server-only'

import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const SITE_SOCIAL_CACHE_TAG = 'site-social-links'
const REVALIDATE_SECONDS = 300

export type SiteSocialLinks = {
  instagram_url: string
  tiktok_url: string
  x_url: string
  facebook_url: string
}

export const EMPTY_SOCIAL_LINKS: SiteSocialLinks = {
  instagram_url: '',
  tiktok_url: '',
  x_url: '',
  facebook_url: '',
}

const urlField = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https?:\/\//i.test(value), {
    message: 'Links must start with http:// or https://',
  })
  .optional()

export const siteSocialLinksSchema = z.object({
  instagram_url: urlField,
  tiktok_url: urlField,
  x_url: urlField,
  facebook_url: urlField,
})

export type SiteSocialLinksInput = z.infer<typeof siteSocialLinksSchema>

const normalize = (row: Record<string, unknown> | null): SiteSocialLinks => ({
  instagram_url: String(row?.instagram_url || '').trim(),
  tiktok_url: String(row?.tiktok_url || '').trim(),
  x_url: String(row?.x_url || '').trim(),
  facebook_url: String(row?.facebook_url || '').trim(),
})

export async function getSiteSocialLinks(supabase = createAdminSupabaseClient()) {
  const { data, error } = await supabase
    .from('site_social_links')
    .select('instagram_url, tiktok_url, x_url, facebook_url')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    return { item: EMPTY_SOCIAL_LINKS, errorMessage: 'Unable to load social links.' }
  }

  return { item: normalize(data), errorMessage: '' }
}

const loadCached = unstable_cache(
  async () => {
    const result = await getSiteSocialLinks()
    if (result.errorMessage) {
      console.error('site social links load failed:', result.errorMessage)
    }
    return result.item
  },
  ['site-social-links'],
  { revalidate: REVALIDATE_SECONDS, tags: [SITE_SOCIAL_CACHE_TAG] },
)

export const getCachedSiteSocialLinks = async () => loadCached()
