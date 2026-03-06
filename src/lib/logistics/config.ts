import { z } from 'zod'
import {
  getNigerianCityOptions,
  normalizeLookupValue,
  resolveNigerianStateName,
  toCityOnlyName,
} from '@/lib/location/nigeria-address'

export const LOGISTICS_TABLE = 'admin_logistics_rates'
export const LOGISTICS_DELIVERY_TYPES = ['standard', 'express'] as const
export type LogisticsDeliveryType = (typeof LOGISTICS_DELIVERY_TYPES)[number]

export const LOGISTICS_ETA_PRESETS = [
  {
    key: 'standard_1_3_days',
    deliveryType: 'standard',
    adminLabel: '1 - 3 days',
    checkoutEstimate: '1 - 3 days',
    etaHours: 48,
  },
  {
    key: 'standard_1_2_days',
    deliveryType: 'standard',
    adminLabel: '1 - 2 days',
    checkoutEstimate: '1 - 2 days',
    etaHours: 36,
  },
  {
    key: 'standard_2_5_days',
    deliveryType: 'standard',
    adminLabel: '2 - 5 days',
    checkoutEstimate: '2 - 5 days',
    etaHours: 96,
  },
  {
    key: 'express_2_24_hours',
    deliveryType: 'express',
    adminLabel: 'Same day delivery',
    checkoutEstimate: 'Same day delivery',
    etaHours: 12,
  },
  {
    key: 'express_1_3_days',
    deliveryType: 'express',
    adminLabel: '1 - 3 days',
    checkoutEstimate: '1 - 3 days',
    etaHours: 48,
  },
  {
    key: 'express_3_7_days',
    deliveryType: 'express',
    adminLabel: '3 - 7 days',
    checkoutEstimate: '3 - 7 days',
    etaHours: 120,
  },
] as const

export type LogisticsEtaKey = (typeof LOGISTICS_ETA_PRESETS)[number]['key']
export const DEFAULT_ETA_BY_DELIVERY_TYPE: Record<LogisticsDeliveryType, LogisticsEtaKey> = {
  standard: 'standard_1_3_days',
  express: 'express_2_24_hours',
}
const LEGACY_ETA_BY_DELIVERY_TYPE: Record<LogisticsDeliveryType, 'next_day' | 'same_day'> = {
  standard: 'next_day',
  express: 'same_day',
}

const STANDARD_ETA_KEYS = new Set<LogisticsEtaKey>(
  LOGISTICS_ETA_PRESETS.filter((preset) => preset.deliveryType === 'standard').map(
    (preset) => preset.key,
  ),
)
const EXPRESS_ETA_KEYS = new Set<LogisticsEtaKey>(
  LOGISTICS_ETA_PRESETS.filter((preset) => preset.deliveryType === 'express').map(
    (preset) => preset.key,
  ),
)
const ALL_ETA_KEYS = new Set<LogisticsEtaKey>(LOGISTICS_ETA_PRESETS.map((preset) => preset.key))

const logisticsEtaInputSchema = z.enum([
  'express_2_24_hours',
  'express_1_3_days',
  'express_3_7_days',
  'standard_1_2_days',
  'standard_1_3_days',
  'standard_2_5_days',
  'express',
  'standard',
  'same_day',
  'next_day',
  'three_days',
])
const logisticsDeliveryTypeSchema = z.enum(['standard', 'express'])
const LOGISTICS_ETA_ALIASES: Record<string, LogisticsEtaKey> = {
  express: 'express_2_24_hours',
  standard: 'standard_1_3_days',
  same_day: 'express_2_24_hours',
  next_day: 'standard_1_2_days',
  three_days: 'standard_1_3_days',
}

const toNumber = z.union([z.number(), z.string()]).transform((value) => Number(value))

export const logisticsRateInputSchema = z.object({
  city: z.string().trim().min(1, 'City is required.'),
  standardPrice: toNumber.refine(
    (value) => Number.isFinite(value) && value >= 0 && value <= 10000000,
    {
      message: 'Standard price is out of range.',
    },
  ),
  expressPrice: toNumber.refine(
    (value) => Number.isFinite(value) && value >= 0 && value <= 10000000,
    {
      message: 'Express price is out of range.',
    },
  ),
  standardEtaKey: z
    .string()
    .trim()
    .refine((value) => STANDARD_ETA_KEYS.has(value as LogisticsEtaKey), {
      message: 'Invalid standard ETA.',
    }),
  expressEtaKey: z
    .string()
    .trim()
    .refine((value) => EXPRESS_ETA_KEYS.has(value as LogisticsEtaKey), {
      message: 'Invalid express ETA.',
    }),
})

export const logisticsRatesPatchSchema = z.object({
  state: z.string().trim().min(1, 'State is required.'),
  rates: z.array(logisticsRateInputSchema).min(1, 'At least one city rate is required.'),
})

export const normalizeLogisticsState = (value: unknown) =>
  resolveNigerianStateName(String(value || '').trim())

export const normalizeLogisticsCity = (state: string, value: unknown) =>
  toCityOnlyName(state, String(value || '').trim())

export const isValidNigerianCityForState = (state: string, city: string) => {
  const canonicalState = normalizeLogisticsState(state)
  if (!canonicalState) return false
  const options = getNigerianCityOptions(canonicalState)
  const normalizedTarget = normalizeLookupValue(city)
  return options.some((entry) => normalizeLookupValue(entry) === normalizedTarget)
}

export const normalizeEtaKey = (value: unknown): LogisticsEtaKey => {
  const rawValue = String(value || '').trim()
  const parsedInput = logisticsEtaInputSchema.safeParse(rawValue)
  if (!parsedInput.success) return DEFAULT_ETA_BY_DELIVERY_TYPE.standard
  const mapped = LOGISTICS_ETA_ALIASES[parsedInput.data] || parsedInput.data
  return ALL_ETA_KEYS.has(mapped as LogisticsEtaKey)
    ? (mapped as LogisticsEtaKey)
    : DEFAULT_ETA_BY_DELIVERY_TYPE.standard
}

export const getEtaPreset = (key: unknown) => {
  const normalized = normalizeEtaKey(key)
  return (
    LOGISTICS_ETA_PRESETS.find((entry) => entry.key === normalized) ||
    LOGISTICS_ETA_PRESETS.find(
      (entry) => entry.key === DEFAULT_ETA_BY_DELIVERY_TYPE.standard,
    ) ||
    LOGISTICS_ETA_PRESETS[0]
  )
}

export const normalizeDeliveryType = (value: unknown): LogisticsDeliveryType => {
  const parsed = logisticsDeliveryTypeSchema.safeParse(String(value || '').trim().toLowerCase())
  return parsed.success ? parsed.data : 'standard'
}

export const getDefaultEtaKeyForDeliveryType = (deliveryType: unknown): LogisticsEtaKey => {
  const normalizedType = normalizeDeliveryType(deliveryType)
  return DEFAULT_ETA_BY_DELIVERY_TYPE[normalizedType]
}

export const toLegacyEtaKey = (etaKey: unknown, deliveryType: unknown = 'standard') => {
  const normalizedEta = normalizeEtaKey(etaKey)
  if (normalizedEta === 'express_2_24_hours') return 'same_day'
  if (normalizedEta === 'standard_1_2_days') return 'next_day'
  if (
    normalizedEta === 'standard_1_3_days' ||
    normalizedEta === 'standard_2_5_days' ||
    normalizedEta === 'express_1_3_days' ||
    normalizedEta === 'express_3_7_days'
  ) {
    return 'three_days'
  }
  return LEGACY_ETA_BY_DELIVERY_TYPE[normalizeDeliveryType(deliveryType)]
}

export const toCheckoutEtaEstimate = (key: unknown) => getEtaPreset(key).checkoutEstimate

export const getEtaPresetsForDeliveryType = (
  deliveryType: unknown,
): Array<(typeof LOGISTICS_ETA_PRESETS)[number]> => {
  const normalized = normalizeDeliveryType(deliveryType)
  return LOGISTICS_ETA_PRESETS.filter((preset) => preset.deliveryType === normalized)
}
