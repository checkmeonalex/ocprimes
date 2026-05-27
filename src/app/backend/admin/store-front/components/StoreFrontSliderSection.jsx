export default function StoreFrontSliderSection({
  isLoading,
  isDesktopSliderEditorOpen,
  onToggleDesktopEditor,
  onOpenMobileEditor,
  renderDesktopEditor,
}) {
  return (
    <section className="border-t border-slate-200 pt-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 w-36 animate-pulse rounded-md bg-slate-200/85" />
              <div className="h-4 w-72 animate-pulse rounded-md bg-slate-200/70" />
            </div>
            <div className="h-8 w-16 animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="hidden lg:block">
            <div className="h-9 w-40 animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="lg:hidden">
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200/80" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Storefront slider</h3>
              <p className="mt-1 text-sm text-slate-500">
                Add a banner to display at the top of your storefront. Use a 16:9 image for best results.
              </p>
            </div>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              16:9
            </span>
          </div>
          <div className="mt-4 hidden lg:block">
            <button
              type="button"
              onClick={onToggleDesktopEditor}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isDesktopSliderEditorOpen ? 'Hide slider editor' : 'Open slider editor'}
            </button>
            {isDesktopSliderEditorOpen ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                {renderDesktopEditor()}
              </div>
            ) : null}
          </div>

          <div className="mt-4 lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileEditor}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open slider editor
            </button>
          </div>
        </>
      )}
    </section>
  );
}
