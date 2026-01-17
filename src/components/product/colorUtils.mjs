const COLOR_SWATCHES = {
  black: '#111827',
  white: '#ffffff',
  gray: '#9ca3af',
  grey: '#9ca3af',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#8b5cf6',
  brown: '#a16207',
  navy: '#1e3a8a',
  tan: '#d2b48c',
  floral: '#f472b6',
}

export const getSwatchStyle = (color) => {
  if (!color) return { backgroundColor: '#d1d5db' }
  const key = color.toLowerCase()
  if (key === 'white') {
    return {
      backgroundColor: '#ffffff',
      backgroundImage:
        'linear-gradient(135deg, #e5e7eb 25%, #ffffff 25%, #ffffff 50%, #e5e7eb 50%, #e5e7eb 75%, #ffffff 75%, #ffffff 100%)',
      backgroundSize: '6px 6px',
    }
  }
  return { backgroundColor: COLOR_SWATCHES[key] || '#d1d5db' }
}
