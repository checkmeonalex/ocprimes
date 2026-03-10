'use client'

import ColorPicker from '@/app/backend/admin/components/ColorPicker.jsx'

export default function HomeLogoGridEditor({
  grid,
  loading = false,
  saving = false,
  error = '',
  onAddLogos,
  onClear,
  onTitleChange,
  onTitleBgColorChange,
  onTitleTextColorChange,
  onRemoveItem,
  onSave,
}) {
  return (
    <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-800'>Logo grid</p>
          <p className='text-xs text-slate-500'>
            Manage the logo grid directly from the homepage editor.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onAddLogos}
            className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
          >
            Add logos
          </button>
          {grid?.items?.length ? (
            <button
              type='button'
              onClick={onClear}
              disabled={saving}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60'
            >
              Clear grid
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500'>
          Loading logo grid...
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='grid gap-4 lg:grid-cols-3'>
            <label className='block lg:col-span-1'>
              <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                Title
              </span>
              <input
                value={grid?.title || ''}
                onChange={(event) => onTitleChange(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
                placeholder='AMAZON'
              />
            </label>

            <div>
              <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                Title background
              </label>
              <ColorPicker
                value={grid?.title_bg_color || '#111827'}
                onChange={onTitleBgColorChange}
                inputClassName='mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white'
                textInputClassName='mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700'
              />
            </div>

            <div>
              <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                Title text color
              </label>
              <ColorPicker
                value={grid?.title_text_color || '#ffffff'}
                onChange={onTitleTextColorChange}
                inputClassName='mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white'
                textInputClassName='mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700'
              />
            </div>
          </div>

          {error ? <p className='text-xs text-rose-600'>{error}</p> : null}

          {grid?.items?.length ? (
            <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
              {grid.items.map((logo) => (
                <div
                  key={logo.id}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-3'
                >
                  <div className='flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white'>
                    <img
                      src={logo.image_url}
                      alt={logo.image_alt || 'Logo'}
                      className='max-h-full max-w-full object-contain'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={() => onRemoveItem(logo.id)}
                    className='mt-3 text-xs font-semibold text-rose-600'
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500'>
              No logos yet. Add images to populate the grid.
            </div>
          )}

          <button
            type='button'
            onClick={onSave}
            disabled={saving}
            className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
          >
            {saving ? 'Saving...' : 'Save logo grid'}
          </button>
        </div>
      )}
    </section>
  )
}
