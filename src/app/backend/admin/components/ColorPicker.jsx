const defaultSwatches = [
  '#111827',
  '#f9fafb',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#a855f7',
  '#0f766e',
  'multicolor',
]

const getSwatchStyle = (value) => {
  if (value === 'multicolor') {
    return {
      background:
        'conic-gradient(#111827, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ec4899, #111827)',
    }
  }
  return { backgroundColor: value || '#111827' }
}

const normalizeColorValue = (value) => {
  if (value === 'multicolor') return value
  if (!value) return ''
  return value
}

const resolveColorValue = (value, fallback = '#111827') =>
  value && value !== 'multicolor' ? value : fallback

const ColorPicker = ({
  value,
  onChange,
  disabled = false,
  showSwatches = true,
  showTextInput = true,
  swatches = defaultSwatches,
  inputClassName = '',
  textInputClassName = '',
}) => {
  const colorValue = resolveColorValue(value)

  return (
    <div>
      <input
        type="color"
        value={colorValue}
        onChange={(event) => onChange?.(event.target.value)}
        className={inputClassName}
        disabled={disabled}
      />
      {!disabled && showSwatches && (
        <div className="mt-3 flex flex-wrap gap-2">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange?.(swatch)}
              className="h-7 w-7 rounded-full border border-slate-200"
              style={getSwatchStyle(swatch)}
              aria-label={`Set color ${swatch}`}
            />
          ))}
        </div>
      )}
      {!disabled && showTextInput && (
        <input
          value={normalizeColorValue(value)}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="#ffffff"
          className={textInputClassName}
        />
      )}
    </div>
  )
}

export default ColorPicker
export { defaultSwatches, getSwatchStyle }
