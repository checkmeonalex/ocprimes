'use client'

export default function HomeStoriesEditor({
  items = [],
  loading = false,
  saving = false,
  error = '',
  onAddMedia,
  onReplaceMedia,
  onRemove,
  onChange,
  onSave,
  onClear,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Home stories</p>
          <p className="text-xs text-slate-500">
            Add images or choose videos that were already attached to products in the product editor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddMedia}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add story media
          </button>
          {items.length ? (
            <button
              type="button"
              onClick={onClear}
              disabled={saving}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              Clear stories
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
          Loading stories...
        </div>
      ) : (
        <div className="space-y-3">
          {items.length ? (
            items.map((story) => (
              <div
                key={story.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="h-28 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {story.media_type === 'video' ? (
                      <video
                        src={story.media_url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        alt={story.media_alt || story.title || 'Story'}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                        {story.media_type}
                      </span>
                    </div>
                    <input
                      value={story.title || ''}
                      onChange={(event) => onChange(story.id, 'title', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      placeholder="Story title"
                    />
                  </div>

                  <div className="flex flex-row gap-2 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => onReplaceMedia(story.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Replace media
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(story.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500">
              No stories yet. Add image media or select product-linked videos to populate the Stories carousel.
            </div>
          )}

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save stories'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
