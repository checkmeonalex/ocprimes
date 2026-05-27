import { PRODUCT_CONDITION_OPTIONS } from '@/lib/admin/product-conditions'

function ProductConditionSelector({
  value = '',
  onChange = () => {},
  className = '',
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_CONDITION_OPTIONS.map((option) => {
          const isActive = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title={option.description}
              aria-pressed={isActive}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {value ? (
        <p className="mt-2 text-[11px] text-slate-500">
          {
            PRODUCT_CONDITION_OPTIONS.find((option) => option.value === value)?.description
          }
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-rose-500">Condition check is required.</p>
      )}
    </div>
  )
}

export default ProductConditionSelector
