'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ensureHomeCategory } from './homePageCategoryApi.mjs'

export default function HomePageEditorRedirect() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const item = await ensureHomeCategory()
        if (!mounted) return
        router.replace(`/backend/admin/categories/${item.id}`)
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to open Home editor.')
      }
    }

    bootstrap()

    return () => {
      mounted = false
    }
  }, [router])

  if (error) {
    return (
      <div className='mx-auto w-full max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm'>
        <p className='text-sm text-rose-700'>{error}</p>
        <Link
          href='/backend/admin/pages'
          className='mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
        >
          Back to Pages
        </Link>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
      <p className='text-sm text-slate-500'>Opening Home editor...</p>
    </div>
  )
}
