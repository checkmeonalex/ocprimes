'use client';

const MODES = [
  {
    value: 'grouped',
    label: 'Grouped',
    description: 'Root categories shown first. Clicking one with sub-categories opens a second panel.',
  },
  {
    value: 'flat',
    label: 'Flat list',
    description: 'All categories shown at once in a single list — no drill-down.',
  },
];

export default function StoreFrontCollectionsMenuSection({
  isLoading,
  brand,
  isSaving,
  onChangeMode,
}) {
  const currentMode = brand?.collections_menu_mode === 'flat' ? 'flat' : 'grouped';

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-3 w-64 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Collections Menu Layout</h3>
      <p className="mt-1 text-sm text-slate-500">
        Controls how categories appear when shoppers open the Collections menu on your store.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const isSelected = currentMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={isSaving}
              onClick={() => onChangeMode(mode.value)}
              className={`relative flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition focus:outline-none ${
                isSelected
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </span>
              )}
              <span className="text-sm font-semibold text-slate-900">{mode.label}</span>
              <span className="text-xs text-slate-500 leading-relaxed">{mode.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
