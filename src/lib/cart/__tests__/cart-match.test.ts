import { describe, it, expect } from 'vitest'
import { findCartEntry, getCartQuantity } from '../cart-match'

const item = (overrides: Record<string, unknown> = {}) => ({
  id: '42',
  selectedVariationId: 'v1',
  selectedColor: 'red',
  selectedSize: 'M',
  quantity: 2,
  ...overrides,
})

describe('findCartEntry', () => {
  it('returns null for empty or invalid inputs', () => {
    expect(findCartEntry(null, item())).toBeNull()
    expect(findCartEntry([], item())).toBeNull()
    expect(findCartEntry([item()], null)).toBeNull()
    expect(findCartEntry([item()], { id: '' })).toBeNull()
  })

  it('matches on id + variation + color + size', () => {
    const items = [item({ selectedColor: 'blue' }), item()]
    expect(findCartEntry(items, item())).toBe(items[1])
  })

  it('treats numeric and string ids as equal', () => {
    const items = [item({ id: 42 })]
    expect(findCartEntry(items, item({ id: '42' }))).toBe(items[0])
  })

  it('treats missing selection fields as "default"', () => {
    const items = [item({ selectedVariationId: null, selectedColor: undefined, selectedSize: '' })]
    expect(findCartEntry(items, { id: '42' })).toBe(items[0])
  })

  it('falls back to variation-only match when color/size differ', () => {
    const items = [item({ selectedColor: 'server-blue', selectedSize: 'server-M' })]
    expect(findCartEntry(items, item())).toBe(items[0])
  })

  it('does not fall back to variation-only match for non-variation products', () => {
    const items = [item({ selectedVariationId: null, selectedColor: 'blue' })]
    expect(
      findCartEntry(items, { id: '42', selectedVariationId: null, selectedColor: 'red' }),
    ).toBeNull()
  })

  it('does not match a different product id', () => {
    expect(findCartEntry([item({ id: '99' })], item())).toBeNull()
  })
})

describe('getCartQuantity', () => {
  it('returns the matched entry quantity', () => {
    expect(getCartQuantity([item({ quantity: 3 })], item())).toBe(3)
  })

  it('returns 0 when there is no match', () => {
    expect(getCartQuantity([], item())).toBe(0)
    expect(getCartQuantity([item({ id: '99' })], item())).toBe(0)
  })
})
