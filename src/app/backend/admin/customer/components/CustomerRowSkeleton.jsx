function CustomerRowSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 px-6 py-3 sm:grid sm:grid-cols-[minmax(180px,_2fr)_minmax(120px,_1.2fr)_minmax(120px,_1fr)_minmax(180px,_2fr)_minmax(80px,_0.8fr)] sm:items-center sm:gap-4">
      <div className="flex w-full items-center justify-between sm:w-auto">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80" />
            <div className="h-2 w-36 animate-pulse rounded-full bg-slate-100 sm:hidden" />
          </div>
        </div>
        <span className="ml-3 h-3 w-10 animate-pulse rounded-full bg-slate-100 sm:hidden" />
      </div>
      <div className="hidden h-3 w-16 animate-pulse rounded-full bg-slate-100 sm:block" />
      <div className="hidden h-3 w-20 animate-pulse rounded-full bg-slate-100 sm:block" />
      <div className="hidden h-3 w-32 animate-pulse rounded-full bg-slate-100 sm:block" />
      <div className="hidden h-3 w-10 animate-pulse rounded-full bg-slate-100 sm:block" />
    </div>
  );
}

export default CustomerRowSkeleton;
