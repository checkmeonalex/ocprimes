const isMeaningfulValue = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== 'default'

export const getSelectionSummary = (item: {
  selectedVariationLabel?: unknown
  selectedColor?: unknown
  selectedSize?: unknown
}) => {
  const parts: string[] = []

  if (isMeaningfulValue(item?.selectedVariationLabel)) {
    parts.push(String(item.selectedVariationLabel))
  }
  if (isMeaningfulValue(item?.selectedColor)) {
    parts.push(`Color: ${String(item.selectedColor)}`)
  }
  if (isMeaningfulValue(item?.selectedSize)) {
    parts.push(`Size: ${String(item.selectedSize)}`)
  }

  return parts.length > 0 ? parts.join(' | ') : 'Standard option'
}
