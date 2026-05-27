'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function SharedWishlistPage({ params }) {
  const token = params.token
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadShared = async () => {
      try {
        const response = await fetch(`/api/wishlist/share/${token}`)
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Shared wishlist not found.')
        }
        setData(payload?.data || null)
      } catch (err) {
        setError(err?.message || 'Shared wishlist not found.')
      }
    }
    if (token) loadShared()
  }, [token])

  if (error) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-10'>
        <p className='text-sm text-rose-500'>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-10'>
        <p className='text-sm text-gray-500'>Loading wishlist...</p>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-5xl px-4 py-10 space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold text-gray-900'>
          {data.wishlist?.name || 'Shared wishlist'}
        </h1>
        <p className='text-sm text-gray-500'>Shared list</p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {data.items?.length ? (
          data.items.map((item) => (
            <div key={item.id} className='rounded-xl border border-gray-200 p-3'>
              <div className='relative h-32 w-full overflow-hidden rounded-lg bg-gray-100'>
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    fill
                    sizes='200px'
                    className='object-cover'
                    unoptimized
                  />
                ) : null}
              </div>
              <div className='mt-3 space-y-1'>
                <Link
                  href={`/product/${item.product_slug}`}
                  className='text-sm font-semibold text-gray-900 line-clamp-2'
                >
                  {item.product_name}
                </Link>
                <p className='text-xs text-gray-500'>${item.product_price}</p>
              </div>
            </div>
          ))
        ) : (
          <p className='text-sm text-gray-500'>No items in this list yet.</p>
        )}
      </div>
    </div>
  )
}
