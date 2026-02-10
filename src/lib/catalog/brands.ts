import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export const fetchBrandBySlugOrId = async (value: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null

  noStore()
  const supabase = await createServerSupabaseClient()

  const baseQuery = () =>
    supabase
      .from('admin_brands')
      .select('id, name, slug, description')
      .limit(1)

  const { data: bySlug } = await baseQuery().eq('slug', trimmed).maybeSingle()
  if (bySlug?.id) return bySlug

  const { data: byId } = await baseQuery().eq('id', trimmed).maybeSingle()
  if (byId?.id) return byId

  return null
}
