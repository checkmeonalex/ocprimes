import { PRODUCT_PACKAGING_OPTIONS } from '@/lib/admin/product-packaging'

function ProductPackagingSelector({
  value = 'in_wrap_nylon',
  onChange = () => {},
  className = '',
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_PACKAGING_OPTIONS.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-pressed={active}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {
          PRODUCT_PACKAGING_OPTIONS.find((option) => option.value === value)?.details
        }
      </p>
    </div>
  )
}

export default ProductPackagingSelector
