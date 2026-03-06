'use client'

const inputClassName =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const textAreaClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const createPickupLocationDraft = (index = 0) => ({
  id: '',
  label: `Pickup location ${index + 1}`,
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Nigeria',
  hours: '',
  note: '',
  phone: '',
  isActive: true,
  sortOrder: index,
})

export default function PickupLocationsEditor({ locations = [], onChange }) {
  const updateField = (index, field, value) => {
    onChange((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]: value,
            }
          : entry,
      ),
    )
  }

  const removeLocation = (index) => {
    onChange((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
  }

  const addLocation = () => {
    onChange((prev) => [...prev, createPickupLocationDraft(prev.length)])
  }

  return (
    <section className='px-4 py-4 sm:px-5'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h3 className='text-base font-semibold text-slate-900'>Pickup locations</h3>
          <p className='mt-1 text-xs text-slate-500'>
            Add one or more pickup hubs for checkout pickup mode.
          </p>
        </div>
        <button
          type='button'
          onClick={addLocation}
          className='inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50'
        >
          Add pickup location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className='mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-sm text-slate-500'>
          No pickup location yet. Add one to enable pickup at checkout.
        </div>
      ) : (
        <div className='mt-3 space-y-3'>
          {locations.map((location, index) => (
            <article
              key={`pickup-location-${location.id || index}`}
              className='rounded-xl border border-slate-200 bg-white p-3'
            >
              <div className='mb-3 flex items-center justify-between gap-2'>
                <label className='inline-flex items-center gap-2 text-xs font-medium text-slate-700'>
                  <input
                    type='checkbox'
                    checked={location.isActive !== false}
                    onChange={(event) => updateField(index, 'isActive', event.target.checked)}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                  Active
                </label>
                <button
                  type='button'
                  onClick={() => removeLocation(index)}
                  className='inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50'
                >
                  Remove
                </button>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Label</label>
                  <input
                    type='text'
                    value={location.label || ''}
                    onChange={(event) => updateField(index, 'label', event.target.value)}
                    className={inputClassName}
                    placeholder='OCPRIMES Pickup Hub'
                  />
                </div>

                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Address line 1</label>
                  <input
                    type='text'
                    value={location.line1 || ''}
                    onChange={(event) => updateField(index, 'line1', event.target.value)}
                    className={inputClassName}
                    placeholder='17 Admiralty Way'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>Address line 2</label>
                  <input
                    type='text'
                    value={location.line2 || ''}
                    onChange={(event) => updateField(index, 'line2', event.target.value)}
                    className={inputClassName}
                    placeholder='Lekki Phase 1'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>State</label>
                  <input
                    type='text'
                    value={location.state || ''}
                    onChange={(event) => updateField(index, 'state', event.target.value)}
                    className={inputClassName}
                    placeholder='Lagos'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>City</label>
                  <input
                    type='text'
                    value={location.city || ''}
                    onChange={(event) => updateField(index, 'city', event.target.value)}
                    className={inputClassName}
                    placeholder='Lagos'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>Postal code</label>
                  <input
                    type='text'
                    value={location.postalCode || ''}
                    onChange={(event) => updateField(index, 'postalCode', event.target.value)}
                    className={inputClassName}
                    placeholder='101233'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>Country</label>
                  <input
                    type='text'
                    value={location.country || ''}
                    onChange={(event) => updateField(index, 'country', event.target.value)}
                    className={inputClassName}
                    placeholder='Nigeria'
                  />
                </div>

                <div>
                  <label className='text-xs font-medium text-slate-500'>Contact phone</label>
                  <input
                    type='text'
                    value={location.phone || ''}
                    onChange={(event) => updateField(index, 'phone', event.target.value)}
                    className={inputClassName}
                    placeholder='+234 901 234 5678'
                  />
                </div>

                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Pickup hours</label>
                  <input
                    type='text'
                    value={location.hours || ''}
                    onChange={(event) => updateField(index, 'hours', event.target.value)}
                    className={inputClassName}
                    placeholder='Mon - Sat, 9:00 AM - 6:00 PM'
                  />
                </div>

                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Pickup note</label>
                  <textarea
                    rows={2}
                    value={location.note || ''}
                    onChange={(event) => updateField(index, 'note', event.target.value)}
                    className={textAreaClassName}
                    placeholder='Bring your order ID and phone number for easy pickup.'
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
