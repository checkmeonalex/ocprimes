import { useEffect, useState } from 'react'
import { fetchProducts } from '../products/functions/products.mjs'

const formatPrice = (value) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

function ProductPickerModal({ isOpen, onClose, onSelect }) {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadProducts = async ({ requestedPage = 1, replace = false, search = '' } = {}) => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchProducts({
        page: requestedPage,
        perPage: 12,
        search,
        status: 'publish',
      })
      const nextItems = Array.isArray(payload?.items) ? payload.items : []
      setItems((prev) => (replace ? nextItems : [...prev, ...nextItems]))
      setPage(requestedPage)
      if (payload?.pages) {
        setHasMore(requestedPage < Number(payload.pages))
      } else {
        setHasMore(nextItems.length === 12)
      }
    } catch (err) {
      setError(err?.message || 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setItems([])
    setPage(1)
    setHasMore(false)
    setSearchTerm('')
    loadProducts({ requestedPage: 1, replace: true, search: '' })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handle = setTimeout(() => {
      loadProducts({ requestedPage: 1, replace: true, search: searchTerm.trim() })
    }, 300)
    return () => clearTimeout(handle)
  }, [searchTerm, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close product picker"
      />
      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Products
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Select a product</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                className="group text-left"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-900 line-clamp-2">
                  {product.name}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  ${formatPrice(Number(product.discount_price) || Number(product.price))}
                </div>
              </button>
            ))}
          </div>
          {loading && (
            <div className="text-center text-sm text-slate-400">Loading products...</div>
          )}
          {!loading && hasMore && (
            <button
              type="button"
              onClick={() =>
                loadProducts({ requestedPage: page + 1, replace: false, search: searchTerm.trim() })
              }
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductPickerModal
