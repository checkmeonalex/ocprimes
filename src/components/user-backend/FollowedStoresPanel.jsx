'use client'

import { useEffect, useState } from 'react'
import { useOptionalCart } from '@/context/CartContext'
import normalizeProduct from '@/components/product/catalog/normalizeProduct.mjs'
import FollowedStoreCard from '@/components/user-backend/FollowedStoreCard'
import FollowedStoresLoadingSkeleton from '@/components/user-backend/FollowedStoresLoadingSkeleton'

const PREVIEW_PRODUCTS_LIMIT = 6

export default function FollowedStoresPanel() {
  const cart = useOptionalCart()
  const addItem = cart?.addItem || (() => {})
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUpdatingId, setIsUpdatingId] = useState('')

  const loadStores = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: '1',
        per_page: '40',
        include_previews: '1',
        preview_limit: String(PREVIEW_PRODUCTS_LIMIT),
      })
      const response = await fetch(`/api/user/followed-stores?${params.toString()}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load followed stores.')
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch (loadError) {
      setItems([])
      setError(loadError?.message || 'Unable to load followed stores.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  const unfollow = async (store) => {
    const slug = String(store?.brand_slug || '').trim()
    if (!slug) return

    setIsUpdatingId(String(store.brand_id || slug))
    setError('')
    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(slug)}/follow`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to unfollow store.')
      }
      const removedBrandId = String(store.brand_id || '')
      setItems((prev) => prev.filter((entry) => String(entry?.brand_id || '') !== removedBrandId))
    } catch (unfollowError) {
      setError(unfollowError?.message || 'Unable to unfollow store.')
    } finally {
      setIsUpdatingId('')
    }
  }

  return (
    <div className='rounded-xl border border-slate-200 bg-white p-0 sm:p-5 shadow-sm'>
      <div className='px-4 pt-4 sm:px-0 sm:pt-0'>
        <h1 className='text-xl font-semibold text-slate-900'>Followed stores</h1>
        <p className='mt-2 text-sm text-slate-600'>Manage the stores you follow.</p>
      </div>

      {isLoading ? <FollowedStoresLoadingSkeleton /> : null}

      {!isLoading && error ? <p className='mt-6 text-sm text-rose-600'>{error}</p> : null}

      {!isLoading && !error && !items.length ? (
        <div className='mt-6 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600'>
          You’re not following any stores yet. Follow your favorite stores to see them here.
        </div>
      ) : null}

      {!isLoading && !error && items.length ? (
        <div className='mt-6 grid gap-5'>
          {items.map((store) => {
            const brandId = String(store?.brand_id || '')
            const slug = String(store?.brand_slug || '')
            const rawProducts = Array.isArray(store?.preview_products) ? store.preview_products : []
            const products = rawProducts.map(normalizeProduct).filter((entry) => entry?.id)

            return (
              <FollowedStoreCard
                key={brandId || slug}
                store={store}
                isUpdating={isUpdatingId === (brandId || slug)}
                onUnfollow={unfollow}
                products={products}
                isLoadingProducts={false}
                productsError=''
                onAddToCart={addItem}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
