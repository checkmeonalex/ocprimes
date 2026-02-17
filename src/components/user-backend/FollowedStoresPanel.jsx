'use client'

import { useEffect, useState } from 'react'
import { useOptionalCart } from '@/context/CartContext'
import normalizeProduct from '@/components/product/catalog/normalizeProduct.mjs'
import FollowedStoreCard from '@/components/user-backend/FollowedStoreCard'
import FollowedStoresLoadingSkeleton from '@/components/user-backend/FollowedStoresLoadingSkeleton'

const PREVIEW_PRODUCTS_LIMIT = 6
const PREVIEW_FETCH_PAGE_SIZE = 18
const PREVIEW_FETCH_CONCURRENCY = 4

const pickNewestBiasedRandomProducts = (products, limit = PREVIEW_PRODUCTS_LIMIT) => {
  const source = (Array.isArray(products) ? products : []).filter((item) => item?.id)
  if (!source.length) return []
  const pool = source.slice(0, Math.max(limit * 3, limit))
  const weightedPool = pool.map((item, index) => ({
    item,
    weight: Math.max(1, pool.length - index),
  }))
  const selected = []

  while (selected.length < limit && weightedPool.length) {
    const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = Math.random() * totalWeight
    let selectedIndex = 0
    for (let index = 0; index < weightedPool.length; index += 1) {
      roll -= weightedPool[index].weight
      if (roll <= 0) {
        selectedIndex = index
        break
      }
    }
    selected.push(weightedPool[selectedIndex].item)
    weightedPool.splice(selectedIndex, 1)
  }

  return selected
}

export default function FollowedStoresPanel() {
  const cart = useOptionalCart()
  const addItem = cart?.addItem || (() => {})
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUpdatingId, setIsUpdatingId] = useState('')
  const [productsByBrandId, setProductsByBrandId] = useState({})
  const [productLoadingByBrandId, setProductLoadingByBrandId] = useState({})
  const [productErrorByBrandId, setProductErrorByBrandId] = useState({})

  const loadStores = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/user/followed-stores?page=1&per_page=40')
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

  useEffect(() => {
    const followedStores = Array.isArray(items) ? items : []
    if (!followedStores.length) {
      setProductsByBrandId({})
      setProductLoadingByBrandId({})
      setProductErrorByBrandId({})
      return
    }

    let cancelled = false
    const queue = followedStores.slice()
    const initialLoading = {}
    followedStores.forEach((store) => {
      const brandId = String(store?.brand_id || '').trim()
      if (brandId) {
        initialLoading[brandId] = true
      }
    })
    setProductLoadingByBrandId(initialLoading)
    setProductErrorByBrandId({})

    const workerCount = Math.min(PREVIEW_FETCH_CONCURRENCY, queue.length)

    const worker = async () => {
      while (queue.length && !cancelled) {
        const store = queue.shift()
        const brandId = String(store?.brand_id || '').trim()
        const slug = String(store?.brand_slug || '').trim()

        if (!brandId || !slug) {
          if (!cancelled && brandId) {
            setProductLoadingByBrandId((prev) => ({ ...prev, [brandId]: false }))
            setProductsByBrandId((prev) => ({ ...prev, [brandId]: [] }))
          }
          continue
        }

        try {
          const params = new URLSearchParams({
            vendor: slug,
            page: '1',
            per_page: String(PREVIEW_FETCH_PAGE_SIZE),
          })
          const response = await fetch(`/api/products?${params.toString()}`)
          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(payload?.error || 'Unable to load store products.')
          }

          const products = Array.isArray(payload?.items) ? payload.items : []
          const selected = pickNewestBiasedRandomProducts(products, PREVIEW_PRODUCTS_LIMIT)
          const normalized = selected.map(normalizeProduct).filter((item) => item?.id)

          if (cancelled) return
          setProductsByBrandId((prev) => ({
            ...prev,
            [brandId]: normalized,
          }))
          setProductErrorByBrandId((prev) => ({
            ...prev,
            [brandId]: '',
          }))
        } catch (loadError) {
          if (cancelled) return
          setProductsByBrandId((prev) => ({
            ...prev,
            [brandId]: [],
          }))
          setProductErrorByBrandId((prev) => ({
            ...prev,
            [brandId]: loadError?.message || 'Unable to load products for this store.',
          }))
        } finally {
          if (cancelled) return
          setProductLoadingByBrandId((prev) => ({
            ...prev,
            [brandId]: false,
          }))
        }
      }
    }

    Promise.all(Array.from({ length: workerCount }).map(() => worker()))

    return () => {
      cancelled = true
    }
  }, [items])

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
      setProductsByBrandId((prev) => {
        const next = { ...prev }
        delete next[removedBrandId]
        return next
      })
      setProductLoadingByBrandId((prev) => {
        const next = { ...prev }
        delete next[removedBrandId]
        return next
      })
      setProductErrorByBrandId((prev) => {
        const next = { ...prev }
        delete next[removedBrandId]
        return next
      })
    } catch (unfollowError) {
      setError(unfollowError?.message || 'Unable to unfollow store.')
    } finally {
      setIsUpdatingId('')
    }
  }

  return (
    <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h1 className='text-xl font-semibold text-slate-900'>Followed stores</h1>
      <p className='mt-2 text-sm text-slate-600'>Manage the stores you follow.</p>

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
            const products = productsByBrandId[brandId] || []

            return (
              <FollowedStoreCard
                key={brandId || slug}
                store={store}
                isUpdating={isUpdatingId === brandId}
                onUnfollow={unfollow}
                products={products}
                isLoadingProducts={Boolean(productLoadingByBrandId[brandId])}
                productsError={String(productErrorByBrandId[brandId] || '')}
                onAddToCart={addItem}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
