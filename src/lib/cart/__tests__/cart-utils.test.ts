import { describe, it, expect } from 'vitest'
import { normalizeValue, buildKey, normalizeItem, normalizeUpsertItem } from '../utils'
import { getSelectionSummary } from '../selection-summary'

describe('normalizeValue', () => {
  it('trims strings and falls back to "default" for blanks', () => {
    expect(normalizeValue('  red ')).toBe('red')
    expect(normalizeValue('   ')).toBe('default')
    expect(normalizeValue('')).toBe('default')
  })

  it('stringifies numbers and defaults everything else', () => {
    expect(normalizeValue(7)).toBe('7')
    expect(normalizeValue(null)).toBe('default')
    expect(normalizeValue(undefined)).toBe('default')
  })
})

describe('buildKey', () => {
  it('builds a stable composite key', () => {
    expect(
      buildKey({ id: '42', selectedVariationId: 'v1', selectedColor: 'red', selectedSize: 'M' }),
    ).toBe('42-v1-red-M')
  })

  it('uses "default" for missing selections', () => {
    expect(
      buildKey({
        id: '42',
        selectedVariationId: undefined,
        selectedColor: undefined,
        selectedSize: undefined,
      }),
    ).toBe('42-default-default-default')
  })
})

describe('normalizeItem', () => {
  const raw = {
    id: 42,
    name: 'Shirt',
    price: '1999.5',
    originalPrice: '2500',
    quantity: '3',
    selectedColor: 'red',
  }

  it('coerces price, originalPrice and quantity to numbers', () => {
    const item = normalizeItem(raw)
    expect(item.price).toBe(1999.5)
    expect(item.originalPrice).toBe(2500)
    expect(item.quantity).toBe(3)
    expect(item.id).toBe('42')
  })

  it('defaults quantity to 1 and originalPrice to null', () => {
    const item = normalizeItem({ id: 1, name: 'X', price: 10 })
    expect(item.quantity).toBe(1)
    expect(item.originalPrice).toBeNull()
  })
})

describe('normalizeUpsertItem', () => {
  it('clamps negative quantities to 0 and defaults missing quantity to 0', () => {
    expect(normalizeUpsertItem({ id: 1, name: 'X', price: 10, quantity: -5 }).quantity).toBe(0)
    expect(normalizeUpsertItem({ id: 1, name: 'X', price: 10 }).quantity).toBe(0)
  })
})

describe('getSelectionSummary', () => {
  it('joins meaningful selections with a pipe', () => {
    expect(getSelectionSummary({ selectedColor: 'Red', selectedSize: 'M' })).toBe(
      'Color: Red | Size: M',
    )
  })

  it('ignores "default" placeholders and empty values', () => {
    expect(getSelectionSummary({ selectedColor: 'default', selectedSize: '  ' })).toBe(
      'Standard option',
    )
  })
})
