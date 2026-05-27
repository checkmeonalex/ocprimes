'use client'

export default function HomeHotspotEditor({
  title = '',
  layouts = [],
  activeLayout = null,
  loading = false,
  saving = false,
  error = '',
  onTitleChange,
  onAddSlide,
  onSelectSlide,
  onChooseImage,
  onRemoveSlide,
  onImageClick,
  onEditHotspot,
  onRemoveHotspot,
  onSave,
}) {
  return (
    <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-800'>Hotspot products</p>
          <p className='text-xs text-slate-500'>
            Manage hotspot slides directly from the homepage editor.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onAddSlide}
            className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
          >
            Add slide
          </button>
          <button
            type='button'
            onClick={onChooseImage}
            disabled={!activeLayout}
            className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
          >
            {activeLayout?.image_url ? 'Change image' : 'Select image'}
          </button>
          {activeLayout ? (
            <button
              type='button'
              onClick={onRemoveSlide}
              disabled={saving}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60'
            >
              Remove slide
            </button>
          ) : null}
        </div>
      </div>

      <label className='block'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
          Title
        </span>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
          placeholder='Just For You'
        />
      </label>

      {loading ? (
        <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500'>
          Loading hotspot layout...
        </div>
      ) : (
        <div className='grid gap-4 lg:grid-cols-[1.5fr_1fr]'>
          <div className='space-y-3'>
            {layouts.length > 0 ? (
              <div className='featured-scroll flex gap-3 overflow-x-auto pb-2 pr-1'>
                {layouts.map((layout, index) => (
                  <button
                    key={layout.id}
                    type='button'
                    onClick={() => onSelectSlide(layout.id)}
                    className='flex flex-col items-start gap-2 text-left'
                  >
                    <div
                      className={`h-16 w-24 overflow-hidden rounded-xl border ${
                        layout.id === activeLayout?.id ? 'border-slate-900' : 'border-slate-200'
                      } bg-slate-50`}
                    >
                      {layout.image_url ? (
                        <img
                          src={layout.image_url}
                          alt={`Slide ${index + 1}`}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-[10px] text-slate-400'>
                          No image
                        </div>
                      )}
                    </div>
                    <span className='text-[11px] font-semibold text-slate-700'>
                      Slide {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-xs text-slate-500'>
                No slides yet. Add a slide to get started.
              </div>
            )}

            <div
              onClick={onImageClick}
              className='relative block w-full overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50'
            >
              {activeLayout?.image_url ? (
                <>
                  <img
                    src={activeLayout.image_url}
                    alt={activeLayout.image_alt || 'Hotspot'}
                    className='w-full object-cover'
                  />
                  {(activeLayout.hotspots || []).map((hotspot, index) => (
                    <button
                      key={hotspot.id}
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation()
                        onEditHotspot(hotspot.id)
                      }}
                      className='absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-slate-900 text-[11px] font-semibold text-white shadow-lg'
                      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                    >
                      {index + 1}
                    </button>
                  ))}
                </>
              ) : (
                <div className='flex min-h-[320px] items-center justify-center text-sm text-slate-400'>
                  Select a hotspot image
                </div>
              )}
            </div>
          </div>

          <div className='space-y-3'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>
                Hotspots
              </p>
              {activeLayout?.hotspots?.length ? (
                <div className='mt-3 space-y-2'>
                  {activeLayout.hotspots.map((hotspot, index) => (
                    <div
                      key={hotspot.id}
                      className='rounded-2xl border border-slate-200 bg-white px-3 py-2'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-xs font-semibold text-slate-800'>Hotspot {index + 1}</p>
                          <p className='mt-1 text-xs text-slate-500'>
                            {hotspot.product?.name || 'Select a product'}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => onEditHotspot(hotspot.id)}
                            className='text-[11px] font-semibold text-slate-700'
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => onRemoveHotspot(hotspot.id)}
                            className='text-[11px] font-semibold text-rose-600'
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='mt-3 text-xs text-slate-500'>
                  Click the image to place a dot, then assign a product.
                </p>
              )}
            </div>

            {error ? <p className='text-xs text-rose-600'>{error}</p> : null}

            <button
              type='button'
              onClick={onSave}
              disabled={saving}
              className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
            >
              {saving ? 'Saving...' : 'Save hotspot layout'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
