'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HomePageBuilder from './HomePageBuilder.jsx'

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

export default function HomePageEditorClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [homePage, setHomePage] = useState(null)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [tags, setTags] = useState([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [homeRes, treeRes, filtersRes, tagsRes] = await Promise.all([
          requestJson('/api/admin/home'),
          requestJson('/api/admin/categories/tree?limit=500'),
          requestJson('/api/admin/product-filters?status=publish'),
          requestJson('/api/admin/tags?per_page=50'),
        ])
        if (!homeRes.response.ok) throw new Error(homeRes.payload?.error || 'Unable to load homepage settings.')
        if (!mounted) return
        setHomePage(homeRes.payload?.item || null)
        const categoryIds = Array.isArray(filtersRes.payload?.category_ids) ? filtersRes.payload.category_ids : []
        if (treeRes.response.ok && Array.isArray(treeRes.payload?.items)) {
          setCategoryOptions(categoryIds.length ? treeRes.payload.items.filter((i) => categoryIds.includes(i.id)) : treeRes.payload.items)
        }
        if (tagsRes.response.ok && Array.isArray(tagsRes.payload?.items)) setTags(tagsRes.payload.items)
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load homepage editor.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-slate-400">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading…
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">Homepage sections</h1>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          View site
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      <HomePageBuilder homePage={homePage} categoryOptions={categoryOptions} tags={tags} />
    </div>
  )
}
