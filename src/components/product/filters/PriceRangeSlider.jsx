'use client'
import { useEffect, useState } from 'react'
import Slider from 'rc-slider'

const PriceRangeSlider = ({ priceBounds, priceRange, onPriceChange }) => {
  const [draftPriceRange, setDraftPriceRange] = useState(priceRange)
  const minGap = priceBounds.min === priceBounds.max ? 0 : 1
  const clampPrice = (value) =>
    Math.max(priceBounds.min, Math.min(priceBounds.max, value))

  useEffect(() => {
    setDraftPriceRange(priceRange)
  }, [priceRange.min, priceRange.max])

  const sanitizeRange = (values) => {
    const nextMin = clampPrice(Math.min(values[0], values[1] - minGap))
    const nextMax = clampPrice(Math.max(values[1], nextMin + minGap))
    return { min: nextMin, max: nextMax }
  }

  const formatPrice = (value) =>
    `$${Math.round(value).toLocaleString()}`

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between text-xs text-gray-700'>
        <span>{formatPrice(draftPriceRange.min)}</span>
        <span>{formatPrice(draftPriceRange.max)}</span>
      </div>
      <div className='px-1'>
        <Slider
          range
          min={priceBounds.min}
          max={priceBounds.max}
          step={1}
          allowCross={false}
          pushable={minGap}
          value={[draftPriceRange.min, draftPriceRange.max]}
          onChange={(values) => {
            if (!Array.isArray(values)) return
            setDraftPriceRange(
              sanitizeRange([Number(values[0]), Number(values[1])])
            )
          }}
          onChangeComplete={(values) => {
            if (!Array.isArray(values)) return
            const nextRange = sanitizeRange([
              Number(values[0]),
              Number(values[1]),
            ])
            setDraftPriceRange(nextRange)
            onPriceChange(nextRange)
          }}
        />
      </div>
    </div>
  )
}

export default PriceRangeSlider
