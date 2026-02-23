'use client'

import CustomSelect from '@/components/common/CustomSelect'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import WishlistListLabel from '@/components/wishlist/WishlistListLabel'
import { useWishlist } from '@/context/WishlistContext'
import { useAlerts } from '@/context/AlertContext'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'invite', label: 'Invite-only' },
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
]

export default function WishlistSaveModal() {
  const { isOpen, view, product, selectedListId, closeSaveModal, markProductSaved } = useWishlist()
  const { pushAlert } = useAlerts()
  const { user, isLoading } = useAuthUser()
  const router = useRouter()
  const pathname = usePathname()

  const [lists, setLists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListVisibility, setNewListVisibility] = useState('invite')
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const canSubmit = Boolean(selectedId && product)

  useEffect(() => {
    if (!isOpen) return
    if (isLoading) return
    if (!user) {
      const next = pathname || '/'
      closeSaveModal()
      router.push(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    const loadLists = async () => {
      setIsFetching(true)
      try {
        const response = await fetch('/api/wishlist/lists')
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load lists.')
        }
        setLists(payload?.items || [])
        if (payload?.items?.length) {
          setSelectedId(payload.items[0].id)
        } else if (productPayload) {
          // Auto-create default list and save when none exists.
          const createRes = await fetch('/api/wishlist/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'All wishlist', visibility: 'invite' }),
          })
          const created = await createRes.json().catch(() => null)
          if (!createRes.ok) {
            throw new Error(created?.error || 'Unable to create default list.')
          }
          const list = created.item
          setLists([list])
          setSelectedId(list.id)
          const saveRes = await fetch('/api/wishlist/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wishlistId: list.id, product: productPayload }),
          })
          const saved = await saveRes.json().catch(() => null)
          if (!saveRes.ok && saveRes.status !== 409) {
            throw new Error(saved?.error || 'Unable to save item.')
          }
          markProductSaved(productPayload.id)
          pushAlert({
            type: 'success',
            title: 'Wishlist',
            message: saveRes.status === 409 ? 'Already in wishlist.' : 'Saved to Saved Items.',
          })
          closeSaveModal()
        }
      } catch (error) {
        pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
      } finally {
        setIsFetching(false)
      }
    }
    loadLists()
  }, [isOpen, user, isLoading, router, pathname, pushAlert])

  const productPayload = useMemo(() => {
    if (!product) return null
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image || product.image_url || product.imageUrl || '',
    }
  }, [product])

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      pushAlert({ type: 'error', title: 'Wishlist', message: 'List name is required.' })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch('/api/wishlist/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          visibility: newListVisibility,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create list.')
      }
      setLists((prev) => [payload.item, ...prev])
      setSelectedId(payload.item.id)
      setNewListName('')
      pushAlert({ type: 'success', title: 'Wishlist', message: 'List created.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!productPayload || !selectedId) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/wishlist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishlistId: selectedId,
          product: productPayload,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok && response.status !== 409) {
        throw new Error(payload?.error || 'Unable to save item.')
      }
      markProductSaved(productPayload.id)
      pushAlert({
        type: 'success',
        title: 'Wishlist',
        message: response.status === 409 ? 'Already in wishlist.' : 'Saved to list.',
      })
      closeSaveModal()
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (selectedListId) {
      setSelectedId(selectedListId)
      return
    }
    if (lists.length && !selectedId) {
      setSelectedId(lists[0].id)
    }
  }, [isOpen, selectedListId, lists, selectedId])

  if (!isOpen) return null

  return (
    <>
    <div className='fixed inset-0 z-[120] flex items-end justify-center bg-black/40'>
      <div className='w-full max-w-2xl rounded-t-3xl bg-white px-4 pb-4 pt-3 shadow-2xl max-h-[65vh] overflow-hidden'>
        <div className='relative flex items-center justify-center pb-2'>
          <button
            type='button'
            onClick={closeSaveModal}
            className='absolute left-0 text-xl font-semibold text-gray-700'
            aria-label='Close'
          >
            ×
          </button>
          <h3 className='text-xs font-semibold tracking-[0.25em] text-gray-700'>
            ADD TO COLLECTION
          </h3>
          <button
            type='button'
            onClick={() => setShowCreateModal(true)}
            className='absolute right-0 text-xl font-semibold text-gray-700'
            aria-label='Create new list'
          >
            +
          </button>
        </div>

        <div className='mt-3'>
          <p className='text-xs text-gray-500'>
            Choose a list for <span className='font-semibold text-gray-800'>{product?.name}</span>
          </p>
          {isFetching ? (
            <div className='mt-6 flex items-center justify-center'>
              <span className='h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700' />
            </div>
          ) : (
            <div className='mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5'>
              {lists.length ? (
                lists.map((list) => (
                  <button
                    key={list.id}
                    type='button'
                    onClick={() => setSelectedId(list.id)}
                    className={`rounded-2xl border p-2 text-left text-[11px] ${
                      selectedId === list.id
                        ? 'border-gray-900 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className='relative h-24 w-full overflow-hidden rounded-xl bg-gray-100'>
                      <div className='grid h-full grid-cols-2 grid-rows-2 gap-0.5 p-0'>
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className='relative rounded bg-white/70 overflow-hidden'>
                            {list.previews?.[index] ? (
                              <Image
                                src={list.previews[index]}
                                alt=''
                                fill
                                sizes='56px'
                                className='object-cover'
                                unoptimized
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {selectedId === list.id ? (
                        <div className='absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] text-white'>
                          ✓
                        </div>
                      ) : null}
                    </div>
                    <span className='mt-2 block text-[10px] font-semibold uppercase text-gray-500'>
                      <WishlistListLabel
                        name={list.name}
                        iconClassName='h-3.5 w-3.5'
                      />
                    </span>
                  </button>
                ))
              ) : (
                <p className='text-sm text-gray-500'>No lists yet. Create one below.</p>
              )}
            </div>
          )}
        </div>

        <div className='mt-4 flex items-center justify-center'>
          <button
            type='button'
            onClick={handleSave}
            disabled={!canSubmit || isSaving}
            className='w-full max-w-xs rounded-full bg-gray-900 px-5 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
          >
            {isSaving ? 'Saving...' : view === 'add' ? 'DONE' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
    {showCreateModal ? (
      <div className='fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4'>
        <div className='w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold text-gray-900'>Create new list</h4>
            <button
              type='button'
              onClick={() => setShowCreateModal(false)}
              className='text-sm font-semibold text-gray-500 hover:text-gray-700'
            >
              ✕
            </button>
          </div>
          <div className='mt-4 space-y-3'>
            <input
              type='text'
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder='List name'
              className='w-full rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10'
            />
            <CustomSelect
              value={newListVisibility}
              onChange={(event) => setNewListVisibility(event.target.value)}
              className='w-full rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CustomSelect>
            <button
              type='button'
              onClick={async () => {
                await handleCreateList()
                setShowCreateModal(false)
              }}
              disabled={isSaving}
              className='w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
            >
              Create
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  )
}
