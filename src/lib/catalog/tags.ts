import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { fetchPublicTaxonomyBySlugOrId } from './public-taxonomy'

export const fetchTagBySlugOrId = async (value: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null

  noStore()
  const supabase = await createServerSupabaseClient()
  return fetchPublicTaxonomyBySlugOrId({
    table: 'admin_tags',
    value: trimmed,
    supabase,
  })
}
