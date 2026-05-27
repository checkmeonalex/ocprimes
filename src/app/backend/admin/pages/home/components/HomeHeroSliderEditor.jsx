'use client'

const SLIDER_SLOT_COUNT = 5

function HeroSlidePreview({ url, label }) {
  if (!url) {
    return (
      <div className='flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400'>
        {label}
      </div>
    )
  }

  return (
    <div className='h-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100'>
      <img src={url} alt={label} className='h-full w-full object-cover' />
    </div>
  )
}

export default function HomeHeroSliderEditor({
  desktopSlides = [],
  mobileSlides = [],
  slideLinks = [],
  activeDevice = 'desktop',
  saving = false,
  onDeviceChange,
  onPickSlide,
  onRemoveSlide,
  onLinkChange,
  onSave,
}) {
  const isMobile = activeDevice === 'mobile'

  return (
    <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-800'>Hero slider</p>
          <p className='text-xs text-slate-500'>
            Manage desktop and mobile hero slides from the dedicated homepage editor.
          </p>
        </div>

        <div className='inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold'>
          <button
            type='button'
            onClick={() => onDeviceChange('desktop')}
            className={`rounded-full px-3 py-1.5 transition ${
              !isMobile ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Desktop
          </button>
          <button
            type='button'
            onClick={() => onDeviceChange('mobile')}
            className={`rounded-full px-3 py-1.5 transition ${
              isMobile ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: SLIDER_SLOT_COUNT }).map((_, index) => {
          const desktopUrl = desktopSlides[index] || ''
          const mobileUrl = mobileSlides[index] || ''
          const previewUrl = isMobile ? mobileUrl : desktopUrl

          return (
            <div key={`home-slide-slot-${index}`} className='rounded-2xl border border-slate-200 p-3'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>
                  Slide {index + 1}
                </p>
                {(desktopUrl || mobileUrl) && (
                  <button
                    type='button'
                    onClick={() => onRemoveSlide(index, activeDevice)}
                    className='text-xs font-semibold text-rose-600'
                  >
                    Remove {isMobile ? 'mobile' : 'desktop'}
                  </button>
                )}
              </div>

              <div className='mt-3'>
                <HeroSlidePreview
                  url={previewUrl}
                  label={isMobile ? 'Mobile hero slide' : 'Desktop hero slide'}
                />
              </div>

              <div className='mt-3 flex gap-2'>
                <button
                  type='button'
                  onClick={() => onPickSlide(index, activeDevice)}
                  className='rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100'
                >
                  {previewUrl ? 'Replace image' : 'Choose image'}
                </button>
              </div>

              <label className='mt-3 block'>
                <span className='text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400'>
                  Slide link
                </span>
                <input
                  value={slideLinks[index] || ''}
                  onChange={(event) => onLinkChange(index, event.target.value)}
                  placeholder='/category/example'
                  className='mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700'
                />
              </label>
            </div>
          )
        })}
      </div>

      <div className='mt-4 flex items-center gap-3'>
        <button
          type='button'
          onClick={onSave}
          disabled={saving}
          className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
        >
          {saving ? 'Saving...' : 'Save hero slider'}
        </button>
      </div>
    </section>
  )
}
