import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  homeStoryRecordSchema,
  type HomeStoryItemInput,
  type HomeStoryRecord,
} from '@/lib/home-stories/schema'

export const HOME_STORIES_TABLE = 'admin_category_stories'
export const HOME_STORIES_REVALIDATE_SECONDS = 60

const STORY_SELECT =
  'id, category_id, title, media_type, media_url, media_key, media_alt, sort_order, created_at'

const parseStoryRows = (rows: unknown[] = []): HomeStoryRecord[] =>
  rows
    .map((row) => homeStoryRecordSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => result.data)

export async function listCategoryStories(
  supabase: any,
  categoryId: string,
): Promise<{ items: HomeStoryRecord[]; errorMessage?: string }> {
  const { data, error } = await supabase
    .from(HOME_STORIES_TABLE)
    .select(STORY_SELECT)
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return { items: [], errorMessage: 'Missing stories table. Run migration 087_admin_category_stories.sql.' }
    }
    return { items: [], errorMessage: 'Unable to load stories.' }
  }

  return { items: parseStoryRows(data || []) }
}

export async function replaceCategoryStories(
  supabase: any,
  categoryId: string,
  items: HomeStoryItemInput[],
): Promise<{ items: HomeStoryRecord[]; errorMessage?: string }> {
  const { error: deleteError } = await supabase
    .from(HOME_STORIES_TABLE)
    .delete()
    .eq('category_id', categoryId)

  if (deleteError) {
    return { items: [], errorMessage: 'Unable to update stories.' }
  }

  if (items.length) {
    const payload = items.map((item, index) => ({
      category_id: categoryId,
      title: item.title,
      media_type: item.media_type,
      media_url: item.media_url,
      media_key: item.media_key || null,
      media_alt: item.media_alt || null,
      sort_order: index,
    }))

    const { error: insertError } = await supabase.from(HOME_STORIES_TABLE).insert(payload)
    if (insertError) {
      return { items: [], errorMessage: 'Unable to save stories.' }
    }
  }

  return listCategoryStories(supabase, categoryId)
}

const loadCachedCategoryStories = unstable_cache(
  async (categoryId: string) => {
    if (!categoryId) return []
    const db = createAdminSupabaseClient()
    const result = await listCategoryStories(db, categoryId)
    if (result.errorMessage) {
      console.error('cached home stories load failed:', result.errorMessage)
      return []
    }
    return result.items
  },
  ['home-category-stories'],
  { revalidate: HOME_STORIES_REVALIDATE_SECONDS },
)

export const getCachedCategoryStories = async (categoryId: string) =>
  loadCachedCategoryStories(String(categoryId || '').trim())
