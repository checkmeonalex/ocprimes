import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  CURRENCY_SETTINGS_TABLE,
  EXCHANGE_RATE_TABLE,
  SUPPORTED_CURRENCY_CODES,
} from '@/lib/i18n/exchange-rate-store'
import type { CurrencyCode } from '@/lib/i18n/locale-config'
import { readExchangeRatesPayload } from '@/lib/i18n/exchange-rate-service'

const rateUpdateSchema = z.object({
  rates: z
    .array(
      z.object({
        code: z.string().min(3).max(3),
        unitPerUsd: z.number().positive(),
      }),
    )
    .min(1),
  useLiveSync: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const payload = await readExchangeRatesPayload(supabase)
  const response = jsonOk(payload)
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, isAdmin, user } = await requireAdmin(request)

  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = rateUpdateSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  const normalizedRows = parsed.data.rates
    .map((entry) => ({
      currency_code: String(entry.code).toUpperCase(),
      unit_per_usd: Number(entry.unitPerUsd),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      source: 'manual',
    }))
    .filter((entry) => SUPPORTED_CURRENCY_CODES.includes(entry.currency_code as CurrencyCode))

  const missingCurrencies = SUPPORTED_CURRENCY_CODES.filter(
    (code) => !normalizedRows.some((entry) => entry.currency_code === code),
  )
  if (missingCurrencies.length) {
    return jsonError(`Missing rate(s): ${missingCurrencies.join(', ')}`, 400)
  }

  const { error: upsertRatesError } = await supabase
    .from(EXCHANGE_RATE_TABLE)
    .upsert(normalizedRows, { onConflict: 'currency_code' })

  if (upsertRatesError) {
    console.error('Exchange rates update failed:', upsertRatesError.message)
    return jsonError('Unable to update exchange rates.', 500)
  }

  const shouldUpdateLiveSync = typeof parsed.data.useLiveSync === 'boolean'
  if (shouldUpdateLiveSync) {
    const { error: upsertSettingsError } = await supabase
      .from(CURRENCY_SETTINGS_TABLE)
      .upsert(
        {
          id: 1,
          use_live_sync: parsed.data.useLiveSync,
          provider: 'currencyapi.com',
          base_currency: 'USD',
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

    if (upsertSettingsError) {
      console.error('Currency settings update failed:', upsertSettingsError.message)
      return jsonError('Unable to update currency settings.', 500)
    }
  }

  const nextPayload = await readExchangeRatesPayload(supabase)
  const response = jsonOk(nextPayload)
  applyCookies(response)
  return response
}
