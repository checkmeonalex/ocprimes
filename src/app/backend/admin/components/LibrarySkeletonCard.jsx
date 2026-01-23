function LibrarySkeletonCard({ compact = false }) {
  return (
    <div
      className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${
        compact ? 'rounded-2xl' : 'rounded-3xl'
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
      </div>
      {!compact && (
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-slate-200/80" />
            <div className="h-2 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarySkeletonCard;
