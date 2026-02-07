'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ensureHomeCategory } from './homePageCategoryApi.mjs'

export default function HomePageAdminCard() {
  const [homeCategory, setHomeCategory] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const item = await ensureHomeCategory()
        if (mounted) setHomeCategory(item)
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load Home page settings.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className='mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
      <p className='text-xs font-semibold uppercase tracking-[0.4em] text-slate-400'>Pages</p>
      <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Home</h1>
      <p className='mt-3 text-sm text-slate-500'>
        Edit hero slider, featured strip, hotspot, browse cards, home product catalog, logo grid, and section order from one place.
      </p>

      {loading && <p className='mt-4 text-sm text-slate-500'>Preparing Home page editor...</p>}

      {error && (
        <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {error}
        </div>
      )}

      {homeCategory?.id && (
        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <Link
            href={`/backend/admin/categories/${homeCategory.id}`}
            className='inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
          >
            Edit Home Content
          </Link>
          <Link
            href={`/backend/admin/categories/${homeCategory.id}#browse-categories-cards`}
            className='inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
          >
            Edit Browse Categories
          </Link>
          <Link
            href={`/backend/admin/categories/${homeCategory.id}#home-product-catalog`}
            className='inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
          >
            Edit Product Catalog
          </Link>
          <Link
            href='/'
            className='inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
          >
            Preview Homepage
          </Link>
        </div>
      )}
    </section>
  )
}
