import { z } from 'zod'

export const ORDER_PROTECTION_DEFAULTS = {
  percentage: 0.02,
  minimumFee: 100,
  maximumFee: 2500,
  claimWindowHours: 48,
} as const

const numberLike = z
  .union([z.number(), z.string()])
  .transform((value) => Number(value))

export const orderProtectionConfigSchema = z.object({
  percentage: numberLike.refine((value) => value > 0 && value <= 1, {
    message: 'Protection percentage must be between 0 and 1.',
  }),
  minimumFee: numberLike.refine((value) => value >= 0 && value <= 10000000, {
    message: 'Minimum fee is out of range.',
  }),
  maximumFee: numberLike.refine((value) => value >= 0 && value <= 10000000, {
    message: 'Maximum fee is out of range.',
  }),
  claimWindowHours: numberLike.refine((value) => value >= 1 && value <= 720, {
    message: 'Claim window must be between 1 and 720 hours.',
  }),
})

export const normalizeOrderProtectionConfig = (input: unknown) => {
  const parsed = orderProtectionConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { ...ORDER_PROTECTION_DEFAULTS }
  }

  const next = {
    percentage: parsed.data.percentage,
    minimumFee: parsed.data.minimumFee,
    maximumFee: parsed.data.maximumFee,
    claimWindowHours: Math.round(parsed.data.claimWindowHours),
  }

  if (next.minimumFee > next.maximumFee) {
    return {
      ...next,
      maximumFee: next.minimumFee,
    }
  }

  return next
}

export const calculateOrderProtectionFee = (
  protectedSubtotal: number,
  configInput?: unknown,
) => {
  const config = normalizeOrderProtectionConfig(configInput)
  const subtotal = Math.max(0, Number(protectedSubtotal) || 0)
  if (subtotal <= 0) return 0
  const raw = subtotal * config.percentage
  return Math.min(Math.max(raw, config.minimumFee), config.maximumFee)
}

export const isDigitalProductLike = (item: {
  isDigital?: boolean | null
  productType?: string | null
}) => {
  if (item?.isDigital) return true
  const normalizedType = String(item?.productType || '')
    .trim()
    .toLowerCase()
  if (!normalizedType) return false
  return normalizedType.includes('digital')
}
