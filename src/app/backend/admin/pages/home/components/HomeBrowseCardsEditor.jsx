'use client'

const SEGMENTS = [
  { key: 'all', label: 'All' },
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
]

export default function HomeBrowseCardsEditor({
  cards = { all: [], men: [], women: [] },
  activeSegment = 'all',
  loading = false,
  saving = false,
  error = '',
  onSegmentChange,
  onAddImages,
  onReplaceImage,
  onRemoveCard,
  onChangeCard,
  onSave,
  onClear,
}) {
  const activeItems = Array.isArray(cards?.[activeSegment]) ? cards[activeSegment] : []

  return (
    <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-800'>Browse categories cards</p>
          <p className='text-xs text-slate-500'>
            Manage the cards shown under People&apos;s Favorite on the homepage.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => onAddImages(activeSegment)}
            className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
          >
            Add images
          </button>
          {activeItems.length ? (
            <button
              type='button'
              onClick={() => onClear(activeSegment)}
              disabled={saving}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60'
            >
              Clear segment
            </button>
          ) : null}
        </div>
      </div>

      <div className='mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold'>
        {SEGMENTS.map((segment) => {
          const active = activeSegment === segment.key
          return (
            <button
              key={segment.key}
              type='button'
              onClick={() => onSegmentChange(segment.key)}
              className={`rounded-full px-3 py-1.5 transition ${
                active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {segment.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className='mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500'>
          Loading browse cards...
        </div>
      ) : (
        <div className='mt-4 space-y-3'>
          {activeItems.length ? (
            activeItems.map((card) => (
              <div
                key={card.id}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-3'
              >
                <div className='flex flex-col gap-3 lg:flex-row'>
                  <div className='h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white'>
                    <img
                      src={card.image_url}
                      alt={card.image_alt || card.name || 'Browse card'}
                      className='h-full w-full object-cover'
                    />
                  </div>

                  <div className='flex-1 space-y-2'>
                    <input
                      value={card.name || ''}
                      onChange={(event) => onChangeCard(activeSegment, card.id, 'name', event.target.value)}
                      className='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700'
                      placeholder='Card name'
                    />
                    <input
                      value={card.link || ''}
                      onChange={(event) => onChangeCard(activeSegment, card.id, 'link', event.target.value)}
                      className='w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700'
                      placeholder='/category/example'
                    />
                  </div>

                  <div className='flex flex-row gap-2 lg:flex-col'>
                    <button
                      type='button'
                      onClick={() => onReplaceImage(activeSegment, card.id)}
                      className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
                    >
                      Replace image
                    </button>
                    <button
                      type='button'
                      onClick={() => onRemoveCard(activeSegment, card.id)}
                      className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-xs text-slate-500'>
              No browse cards in this segment yet.
            </div>
          )}

          {error ? <p className='text-xs text-rose-600'>{error}</p> : null}

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={onSave}
              disabled={saving}
              className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
            >
              {saving ? 'Saving...' : 'Save browse cards'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
