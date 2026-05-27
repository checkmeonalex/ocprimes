import { z } from 'zod'

export const CART_SHIPPING_PROGRESS_DEFAULTS = {
  enabled: true,
  standardFreeShippingThreshold: 50,
  expressFreeShippingThreshold: 100,
} as const

const toNumber = z.union([z.number(), z.string()]).transform((value) => Number(value))

export const cartShippingProgressConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  standardFreeShippingThreshold: toNumber.refine((value) => value >= 0 && value <= 10000000, {
    message: 'Standard threshold is out of range.',
  }),
  expressFreeShippingThreshold: toNumber.refine((value) => value >= 0 && value <= 10000000, {
    message: 'Express threshold is out of range.',
  }),
})

export const normalizeCartShippingProgressConfig = (input: unknown) => {
  const parsed = cartShippingProgressConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { ...CART_SHIPPING_PROGRESS_DEFAULTS }
  }

  const standard = Math.max(0, Number(parsed.data.standardFreeShippingThreshold) || 0)
  const expressRaw = Math.max(0, Number(parsed.data.expressFreeShippingThreshold) || 0)
  const express = expressRaw >= standard ? expressRaw : standard

  return {
    enabled: Boolean(parsed.data.enabled),
    standardFreeShippingThreshold: standard,
    expressFreeShippingThreshold: express,
  }
}

export const getShippingMilestoneState = (
  subtotal: number,
  configInput?: unknown,
) => {
  const config = normalizeCartShippingProgressConfig(configInput)
  const total = Math.max(0, Number(subtotal) || 0)
  const standardUnlocked = total >= config.standardFreeShippingThreshold
  const expressUnlocked = total >= config.expressFreeShippingThreshold

  return {
    config,
    total,
    standardUnlocked,
    expressUnlocked,
    remainingForStandard: Math.max(0, config.standardFreeShippingThreshold - total),
    remainingForExpress: Math.max(0, config.expressFreeShippingThreshold - total),
  }
}
