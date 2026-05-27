import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const NOT_FOUND_CODE = 'PGRST116'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value = '') => UUID_PATTERN.test(String(value || '').trim())

const getLookupClient = (fallbackSupabase?: any) => {
  try {
    return createAdminSupabaseClient()
  } catch (_error) {
    return fallbackSupabase || null
  }
}

const logLookupError = (label: string, error: any) => {
  const code = String(error?.code || '').trim()
  if (!error || code === NOT_FOUND_CODE) return
  console.error(`${label} failed:`, error.message || String(error))
}

export const resolvePublicTaxonomyIdBySlugOrId = async ({
  table,
  value,
  supabase,
}: {
  table: string
  value: string
  supabase?: any
}) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const lookupDb = getLookupClient(supabase)
  if (!lookupDb) return trimmed

  const baseQuery = () => lookupDb.from(table).select('id').limit(1)

  const slugResult = await baseQuery().eq('slug', trimmed).maybeSingle()
  logLookupError(`${table} slug lookup`, slugResult.error)
  if (slugResult.data?.id) return String(slugResult.data.id)

  if (isUuid(trimmed)) {
    const idResult = await baseQuery().eq('id', trimmed).maybeSingle()
    logLookupError(`${table} id lookup`, idResult.error)
    if (idResult.data?.id) return String(idResult.data.id)
  }

  return trimmed
}

export const fetchPublicTaxonomyBySlugOrId = async ({
  table,
  value,
  supabase,
  columns = 'id, name, slug, description',
}: {
  table: string
  value: string
  supabase?: any
  columns?: string
}) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null

  const lookupDb = getLookupClient(supabase)
  if (!lookupDb) return null

  const baseQuery = () => lookupDb.from(table).select(columns).limit(1)

  const slugResult = await baseQuery().eq('slug', trimmed).maybeSingle()
  logLookupError(`${table} record slug lookup`, slugResult.error)
  if (slugResult.data?.id) return slugResult.data

  if (isUuid(trimmed)) {
    const idResult = await baseQuery().eq('id', trimmed).maybeSingle()
    logLookupError(`${table} record id lookup`, idResult.error)
    if (idResult.data?.id) return idResult.data
  }

  return null
}

export const fetchPublicLinkedProductIds = async ({
  table,
  column,
  values,
  supabase,
}: {
  table: string
  column: string
  values: string[]
  supabase?: any
}) => {
  const cleanedValues = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  )

  if (!cleanedValues.length) return []

  const lookupDb = getLookupClient(supabase) || supabase
  if (!lookupDb) return []

  const query = lookupDb.from(table).select('product_id')
  const response =
    cleanedValues.length === 1
      ? await query.eq(column, cleanedValues[0])
      : await query.in(column, cleanedValues)

  logLookupError(`${table} linked product lookup`, response.error)
  if (!Array.isArray(response.data)) return []

  return response.data
    .map((row: any) => String(row?.product_id || '').trim())
    .filter(Boolean)
}
