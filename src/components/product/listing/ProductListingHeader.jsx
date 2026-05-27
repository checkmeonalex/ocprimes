const ProductListingHeader = ({
  eyebrow,
  title,
  subtitle,
  searchPlaceholder,
  onSearchChange,
  primaryActionLabel,
  assistantLabel,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="6" />
          <path d="m15.5 15.5 4 4" />
        </svg>
        <input
          className="w-56 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      <button
        type="button"
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
      >
        {primaryActionLabel}
      </button>
      <button
        type="button"
        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
      >
        {assistantLabel}
      </button>
    </div>
  </div>
);

export default ProductListingHeader;
