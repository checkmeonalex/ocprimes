function CustomerSkeletonCard({
  rows = 6,
  withContainer = true,
  showHeader = true,
  className = '',
}) {
  const containerClass = withContainer
    ? 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
    : '';
  const bodySpacing = showHeader ? 'mt-6' : 'mt-2';

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {showHeader && (
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <span className="h-12 w-12 animate-pulse rounded-full bg-slate-200/80" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200/80" />
            <div className="h-2 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <span className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      )}
      <div className={`${bodySpacing} grid gap-4 md:grid-cols-2`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`row-${index}`}
            className="h-12 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

export default CustomerSkeletonCard;
