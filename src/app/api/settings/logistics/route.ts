import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  getDefaultEtaKeyForDeliveryType,
  getEtaPreset,
  normalizeDeliveryType,
  normalizeLogisticsCity,
  normalizeLogisticsState,
} from '@/lib/logistics/config'
import {
  readLogisticsRateByStateCity,
  readLogisticsRatesByState,
} from '@/lib/logistics/repository'
import {
  isWorldwideCountry,
  readWorldwideLogisticsSettings,
  resolveWorldwideFeeInNgn,
} from '@/lib/logistics/worldwide'

const querySchema = z.object({
  state: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  country: z.string().trim().optional().default(''),
  delivery_type: z.enum(['standard', 'express']).optional().default('standard'),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid logistics query.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const isWorldwideScope = isWorldwideCountry(parsed.data.country)
  const canonicalState = normalizeLogisticsState(parsed.data.state)
  const canonicalCity = canonicalState
    ? normalizeLogisticsCity(canonicalState, parsed.data.city)
    : ''
  const selectedDeliveryType = isWorldwideScope
    ? 'express'
    : normalizeDeliveryType(parsed.data.delivery_type)

  if (isWorldwideScope) {
    const worldwideSettings = await readWorldwideLogisticsSettings(supabase)
    const feeNgn = await resolveWorldwideFeeInNgn(supabase, worldwideSettings.fixedPriceUsd)
    const selectedEtaKey = worldwideSettings.etaKey || getDefaultEtaKeyForDeliveryType('express')
    const selectedPreset = getEtaPreset(selectedEtaKey)
    const response = jsonOk({
      found: true,
      isWorldwide: true,
      country: 'International',
      state: '',
      city: '',
      deliveryType: 'express',
      availableDeliveryTypes: ['express'],
      price: feeNgn,
      displayPrice: Number(worldwideSettings.fixedPriceUsd || 0),
      displayCurrency: 'USD',
      etaKey: selectedEtaKey,
      etaHours: selectedPreset.etaHours,
      checkoutEstimate: selectedPreset.checkoutEstimate,
      deliveryOptions: {
        express: {
          price: feeNgn,
          displayPrice: Number(worldwideSettings.fixedPriceUsd || 0),
          displayCurrency: 'USD',
          etaKey: selectedEtaKey,
          etaHours: selectedPreset.etaHours,
          checkoutEstimate: selectedPreset.checkoutEstimate,
        },
      },
    })
    applyCookies(response)
    return response
  }

  if (!canonicalState) {
    const defaultEtaKey = getDefaultEtaKeyForDeliveryType(selectedDeliveryType)
    const defaultPreset = getEtaPreset(defaultEtaKey)
    const response = jsonOk({
      found: false,
      isWorldwide: false,
      state: '',
      city: '',
      deliveryType: selectedDeliveryType,
      availableDeliveryTypes: ['standard', 'express'],
      price: 0,
      displayPrice: 0,
      displayCurrency: 'NGN',
      etaKey: defaultEtaKey,
      etaHours: defaultPreset.etaHours,
      checkoutEstimate: defaultPreset.checkoutEstimate,
      deliveryOptions: {
        standard: {
          price: 0,
          displayPrice: 0,
          displayCurrency: 'NGN',
          etaKey: getDefaultEtaKeyForDeliveryType('standard'),
          etaHours: getEtaPreset(getDefaultEtaKeyForDeliveryType('standard')).etaHours,
          checkoutEstimate: getEtaPreset(getDefaultEtaKeyForDeliveryType('standard')).checkoutEstimate,
        },
        express: {
          price: 0,
          displayPrice: 0,
          displayCurrency: 'NGN',
          etaKey: getDefaultEtaKeyForDeliveryType('express'),
          etaHours: getEtaPreset(getDefaultEtaKeyForDeliveryType('express')).etaHours,
          checkoutEstimate: getEtaPreset(getDefaultEtaKeyForDeliveryType('express')).checkoutEstimate,
        },
      },
    })
    applyCookies(response)
    return response
  }

  if (canonicalCity) {
    const standardRate = await readLogisticsRateByStateCity(
      supabase,
      canonicalState,
      canonicalCity,
      'standard',
    )
    const expressRate = await readLogisticsRateByStateCity(
      supabase,
      canonicalState,
      canonicalCity,
      'express',
    )
    const selectedRate = selectedDeliveryType === 'express' ? expressRate : standardRate
    const fallbackEtaKey = getDefaultEtaKeyForDeliveryType(selectedDeliveryType)
    const fallbackPreset = getEtaPreset(fallbackEtaKey)
    const standardFallbackKey = getDefaultEtaKeyForDeliveryType('standard')
    const standardFallbackPreset = getEtaPreset(standardFallbackKey)
    const expressFallbackKey = getDefaultEtaKeyForDeliveryType('express')
    const expressFallbackPreset = getEtaPreset(expressFallbackKey)
    const response = jsonOk(
      selectedRate
        ? {
            found: true,
            isWorldwide: false,
            ...selectedRate,
            displayPrice: Number(selectedRate.price || 0),
            displayCurrency: 'NGN',
            deliveryType: selectedDeliveryType,
            availableDeliveryTypes: ['standard', 'express'],
            deliveryOptions: {
              standard: standardRate
                ? {
                    price: Number(standardRate.price || 0),
                    displayPrice: Number(standardRate.price || 0),
                    displayCurrency: 'NGN',
                    etaKey: standardRate.etaKey,
                    etaHours: Number(standardRate.etaHours || 0),
                    checkoutEstimate: standardRate.checkoutEstimate || standardFallbackPreset.checkoutEstimate,
                  }
                : {
                    price: 0,
                    displayPrice: 0,
                    displayCurrency: 'NGN',
                    etaKey: standardFallbackKey,
                    etaHours: standardFallbackPreset.etaHours,
                    checkoutEstimate: standardFallbackPreset.checkoutEstimate,
                  },
              express: expressRate
                ? {
                    price: Number(expressRate.price || 0),
                    displayPrice: Number(expressRate.price || 0),
                    displayCurrency: 'NGN',
                    etaKey: expressRate.etaKey,
                    etaHours: Number(expressRate.etaHours || 0),
                    checkoutEstimate: expressRate.checkoutEstimate || expressFallbackPreset.checkoutEstimate,
                  }
                : {
                    price: 0,
                    displayPrice: 0,
                    displayCurrency: 'NGN',
                    etaKey: expressFallbackKey,
                    etaHours: expressFallbackPreset.etaHours,
                    checkoutEstimate: expressFallbackPreset.checkoutEstimate,
                  },
            },
          }
        : {
            // Missing city configuration means free delivery for that location.
            found: true,
            isWorldwide: false,
            state: canonicalState,
            city: canonicalCity,
            deliveryType: selectedDeliveryType,
            availableDeliveryTypes: ['standard', 'express'],
            price: 0,
            displayPrice: 0,
            displayCurrency: 'NGN',
            etaKey: fallbackEtaKey,
            etaHours: fallbackPreset.etaHours,
            checkoutEstimate: fallbackPreset.checkoutEstimate,
            deliveryOptions: {
              standard: {
                price: 0,
                displayPrice: 0,
                displayCurrency: 'NGN',
                etaKey: standardFallbackKey,
                etaHours: standardFallbackPreset.etaHours,
                checkoutEstimate: standardFallbackPreset.checkoutEstimate,
              },
              express: {
                price: 0,
                displayPrice: 0,
                displayCurrency: 'NGN',
                etaKey: expressFallbackKey,
                etaHours: expressFallbackPreset.etaHours,
                checkoutEstimate: expressFallbackPreset.checkoutEstimate,
              },
            },
          },
    )
    applyCookies(response)
    return response
  }

  const rates = await readLogisticsRatesByState(supabase, canonicalState)
  const response = jsonOk({
    found: rates.length > 0,
    state: canonicalState,
    rates,
  })
  applyCookies(response)
  return response
}
