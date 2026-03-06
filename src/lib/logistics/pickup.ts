import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export const PICKUP_LOCATIONS_TABLE = 'admin_pickup_locations'

const toTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const toOptionalTrimmedString = (value: unknown) => {
  const next = toTrimmedString(value)
  return next.length > 0 ? next : undefined
}

const requiredText = (label: string, max: number) =>
  z.preprocess(
    toTrimmedString,
    z
      .string()
      .trim()
      .min(1, `${label} is required.`)
      .max(max),
  )

const optionalText = (max: number) =>
  z.preprocess(toTrimmedString, z.string().trim().max(max)).optional().default('')

export const pickupLocationInputSchema = z.object({
  id: z.preprocess(toOptionalTrimmedString, z.string().trim().max(120).optional()),
  label: requiredText('Pickup label', 140),
  line1: requiredText('Address line 1', 220),
  line2: optionalText(220),
  city: requiredText('City', 120),
  state: requiredText('State', 120),
  postalCode: optionalText(60),
  country: requiredText('Country', 120),
  hours: optionalText(220),
  note: optionalText(500),
  phone: optionalText(80),
  isActive: z.boolean().optional().default(true),
})

export const pickupLocationsPatchSchema = z.object({
  scope: z.literal('pickup'),
  locations: z
    .array(pickupLocationInputSchema)
    .max(40, 'Pickup locations limit reached.')
    .default([]),
})

type PickupLocationRow = {
  id: string
  label: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  hours: string
  note: string
  phone: string
  is_active: boolean
  sort_order: number
}

const toSafeString = (value: unknown) => String(value || '').trim()

const toPickupLocation = (row: Partial<PickupLocationRow>) => ({
  id: toSafeString(row.id),
  label: toSafeString(row.label),
  line1: toSafeString(row.line1),
  line2: toSafeString(row.line2),
  city: toSafeString(row.city),
  state: toSafeString(row.state),
  postalCode: toSafeString(row.postal_code),
  country: toSafeString(row.country),
  hours: toSafeString(row.hours),
  note: toSafeString(row.note),
  phone: toSafeString(row.phone),
  isActive: Boolean(row.is_active),
  sortOrder: Number(row.sort_order || 0),
})

const toStableId = (value: unknown, index: number) => {
  const raw = toSafeString(value)
  if (raw) return raw
  return `pickup_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 8)}`
}

export const readPickupLocations = async (
  supabase: SupabaseClient,
  options: { activeOnly?: boolean } = {},
) => {
  const { activeOnly = false } = options
  let query = supabase
    .from(PICKUP_LOCATIONS_TABLE)
    .select(
      'id,label,line1,line2,city,state,postal_code,country,hours,note,phone,is_active,sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (activeOnly) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query
  if (error) {
    const code = toSafeString((error as { code?: unknown })?.code)
    const message = toSafeString((error as { message?: unknown })?.message)
    throw new Error(
      ['Unable to load pickup locations.', code, message].filter(Boolean).join(' '),
    )
  }

  return Array.isArray(data) ? data.map((entry) => toPickupLocation(entry)) : []
}

export const upsertPickupLocations = async (
  supabase: SupabaseClient,
  userId: string,
  locations: Array<z.infer<typeof pickupLocationInputSchema>>,
) => {
  const normalized = locations.map((entry, index) => {
    const parsedResult = pickupLocationInputSchema.safeParse(entry)
    if (!parsedResult.success) {
      const issue = parsedResult.error.issues[0]
      const path = Array.isArray(issue?.path) && issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      throw new Error(`${path}${issue?.message || 'Invalid pickup location.'}`)
    }
    const parsed = parsedResult.data
    return {
      id: toStableId(parsed.id, index),
      label: parsed.label,
      line1: parsed.line1,
      line2: parsed.line2,
      city: parsed.city,
      state: parsed.state,
      postal_code: parsed.postalCode || '',
      country: parsed.country,
      hours: parsed.hours || '',
      note: parsed.note || '',
      phone: parsed.phone || '',
      is_active: parsed.isActive !== false,
      sort_order: index,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
  })

  const keepIds = normalized.map((entry) => entry.id)

  if (normalized.length > 0) {
    const { error: upsertError } = await supabase
      .from(PICKUP_LOCATIONS_TABLE)
      .upsert(normalized, { onConflict: 'id' })
    if (upsertError) {
      const code = toSafeString((upsertError as { code?: unknown })?.code)
      const message = toSafeString((upsertError as { message?: unknown })?.message)
      throw new Error(
        ['Unable to save pickup locations.', code, message].filter(Boolean).join(' '),
      )
    }
  }

  const { data: existingIdsData, error: existingIdsError } = await supabase
    .from(PICKUP_LOCATIONS_TABLE)
    .select('id')
  if (existingIdsError) {
    const code = toSafeString((existingIdsError as { code?: unknown })?.code)
    const message = toSafeString((existingIdsError as { message?: unknown })?.message)
    throw new Error(
      ['Unable to read existing pickup locations.', code, message].filter(Boolean).join(' '),
    )
  }
  const existingIds = Array.isArray(existingIdsData)
    ? existingIdsData.map((entry) => toSafeString((entry as { id?: unknown })?.id)).filter(Boolean)
    : []
  const idsToDelete = existingIds.filter((id) => !keepIds.includes(id))
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(PICKUP_LOCATIONS_TABLE)
      .delete()
      .in('id', idsToDelete)
    if (deleteError) {
      const code = toSafeString((deleteError as { code?: unknown })?.code)
      const message = toSafeString((deleteError as { message?: unknown })?.message)
      throw new Error(
        ['Unable to remove deleted pickup locations.', code, message].filter(Boolean).join(' '),
      )
    }
  }

  return readPickupLocations(supabase)
}
