'use client'

import CustomSelect from '@/components/common/CustomSelect'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '@/components/product/ProductCard'
import WishlistListLabel from '@/components/wishlist/WishlistListLabel'
import { useAlerts } from '@/context/AlertContext'
import { useCart } from '@/context/CartContext'
import { isDefaultWishlistName } from '@/lib/wishlist/list-name'

const CARD_COLORS = [
  'bg-rose-100',
  'bg-slate-200',
  'bg-emerald-100',
  'bg-amber-100',
  'bg-purple-100',
  'bg-cyan-100',
]

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'invite', label: 'Invite-only' },
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
]
const WISHLIST_BOOTSTRAP_LIMIT = 30

const WishlistSkeleton = () => (
  <div className='space-y-6'>
    <div className='space-y-2'>
      <div className='h-6 w-40 animate-pulse rounded-md bg-slate-200' />
      <div className='h-4 w-64 animate-pulse rounded-md bg-slate-200' />
    </div>

    <section className='rounded-2xl bg-white shadow-sm'>
      <div className='grid grid-cols-2 gap-4 p-2 md:grid-cols-4 xl:grid-cols-5'>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={`wishlist-skeleton-card-${index}`}
            className='overflow-hidden rounded-md border border-slate-200 bg-white'
          >
            <div className='aspect-square animate-pulse bg-slate-200' />
            <div className='space-y-2 p-3'>
              <div className='h-3.5 w-3/4 animate-pulse rounded bg-slate-200' />
              <div className='h-3.5 w-1/2 animate-pulse rounded bg-slate-200' />
              <div className='h-3 w-2/3 animate-pulse rounded bg-slate-200' />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
)

export default function WishlistPage() {
  const { pushAlert } = useAlerts()
  const { addItem } = useCart()
  const [lists, setLists] = useState([])
  const [selectedListId, setSelectedListId] = useState('')
  const [listDetail, setListDetail] = useState(null)
  const [items, setItems] = useState([])
  const [itemsByList, setItemsByList] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapReady, setIsBootstrapReady] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [newListVisibility, setNewListVisibility] = useState('private')
  const [inviteEmail, setInviteEmail] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [collapsedLists, setCollapsedLists] = useState({})

  const countWords = (value) =>
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean).length

  const clampToMaxWords = (value, maxWords = 50) => {
    const words = value.trim().split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) return value
    return `${words.slice(0, maxWords).join(' ')} `
  }

  const orderedLists = useMemo(() => {
    if (!lists.length) return []
    const all = lists.find((item) => isDefaultWishlistName(item.name))
    const rest = lists.filter((item) => !isDefaultWishlistName(item.name))
    return all ? [all, ...rest] : lists
  }, [lists])
  const allListId = useMemo(
    () => orderedLists.find((item) => isDefaultWishlistName(item.name))?.id || '',
    [orderedLists],
  )
  const isAllSelected = Boolean(selectedListId && allListId && selectedListId === allListId)

  const loadBootstrap = async (preferredListId = '') => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/wishlist/bootstrap?per_list_limit=${WISHLIST_BOOTSTRAP_LIMIT}`,
        { cache: 'no-store' },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load wishlists.')
      }

      const nextLists = Array.isArray(payload?.lists) ? payload.lists : []
      const nextItemsByList =
        payload?.items_by_list && typeof payload.items_by_list === 'object'
          ? payload.items_by_list
          : {}
      const fallbackSelected = String(payload?.selected_list_id || '').trim()
      const currentSelected = String(selectedListId || '').trim()
      const preferred = String(preferredListId || '').trim()
      const selectedCandidate = preferred || currentSelected || fallbackSelected
      const resolvedSelected = nextLists.some((entry) => entry?.id === selectedCandidate)
        ? selectedCandidate
        : String(nextLists[0]?.id || '').trim()

      setLists(nextLists)
      setItemsByList(nextItemsByList)
      setSelectedListId(resolvedSelected)
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
      setIsBootstrapReady(true)
    }
  }

  useEffect(() => {
    void loadBootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedListId) {
      setListDetail(null)
      setItems([])
      return
    }

    const nextListDetail = orderedLists.find((entry) => entry?.id === selectedListId) || null
    setListDetail(nextListDetail)

    if (isAllSelected) {
      const combined = orderedLists
        .flatMap((entry) => (Array.isArray(itemsByList[entry.id]) ? itemsByList[entry.id] : []))
        .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      setItems(combined)
      return
    }

    const selectedItems = Array.isArray(itemsByList[selectedListId]) ? itemsByList[selectedListId] : []
    setItems(selectedItems)
  }, [selectedListId, orderedLists, itemsByList, isAllSelected])

  useEffect(() => {
    if (!listDetail?.share_token) {
      setShareUrl('')
      return
    }
    if (typeof window === 'undefined') return
    setShareUrl(`${window.location.origin}/w/${listDetail.share_token}`)
  }, [listDetail])

  useEffect(() => {
    setDescriptionDraft(listDetail?.description || '')
    setIsEditingDescription(false)
  }, [listDetail?.id])

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      pushAlert({ type: 'error', title: 'Wishlist', message: 'List name is required.' })
      return
    }
    if (newListDescription.trim() && countWords(newListDescription) > 50) {
      pushAlert({ type: 'error', title: 'Wishlist', message: 'Description must be 50 words or less.' })
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/wishlist/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim(),
          visibility: newListVisibility,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create list.')
      }
      setNewListName('')
      setNewListDescription('')
      await loadBootstrap(String(payload?.item?.id || '').trim())
      pushAlert({ type: 'success', title: 'Wishlist', message: 'List created.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateList = async (updates) => {
    if (!listDetail) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/wishlist/lists/${listDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update list.')
      }
      await loadBootstrap(String(payload?.item?.id || listDetail?.id || '').trim())
      pushAlert({ type: 'success', title: 'Wishlist', message: 'List updated.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteList = async () => {
    if (!listDetail) return
    const confirmed = window.confirm('Delete this wishlist?')
    if (!confirmed) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/wishlist/lists/${listDetail.id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete list.')
      }
      await loadBootstrap('')
      pushAlert({ type: 'success', title: 'Wishlist', message: 'List deleted.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/wishlist/items/${itemId}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to remove item.')
      }
      await loadBootstrap(selectedListId)
      pushAlert({ type: 'success', title: 'Wishlist', message: 'Item removed.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const wishlistProductCards = useMemo(
    () =>
      items.map((item) => {
        const image = String(item?.product_image || '').trim()
        const price = Number(item?.product_price) || 0
        const originalPrice = Number(item?.product_original_price)
        const stock = Number.isFinite(Number(item?.product_stock)) ? Number(item.product_stock) : 99
        const vendorName = String(item?.product_vendor || '').trim() || 'OCPRIMES'
        const vendorSlug = String(item?.product_vendor_slug || '').trim()

        return {
          wishlistItemId: item.id,
          id: item.product_id,
          slug: item.product_slug,
          name: item.product_name,
          price,
          originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
          image,
          gallery: image ? [image] : [],
          isPortrait: false,
          vendor: vendorName,
          vendorSlug,
          vendorFont: 'Georgia, serif',
          rating: 0,
          reviews: 0,
          stock,
          isTrending: false,
        }
      }),
    [items],
  )

  const mapItemsToCards = (listItems) =>
    listItems.map((item) => {
      const image = String(item?.product_image || '').trim()
      const price = Number(item?.product_price) || 0
      const originalPrice = Number(item?.product_original_price)
      const stock = Number.isFinite(Number(item?.product_stock)) ? Number(item.product_stock) : 99
      const vendorName = String(item?.product_vendor || '').trim() || 'OCPRIMES'
      const vendorSlug = String(item?.product_vendor_slug || '').trim()

      return {
        wishlistItemId: item.id,
        id: item.product_id,
        slug: item.product_slug,
        name: item.product_name,
        price,
        originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
        image,
        gallery: image ? [image] : [],
        isPortrait: false,
        vendor: vendorName,
        vendorSlug,
        vendorFont: 'Georgia, serif',
        rating: 0,
        reviews: 0,
        stock,
        isTrending: false,
      }
    })

  const groupedLists = useMemo(() => orderedLists, [orderedLists])

  const handleSaveDescription = async () => {
    if (!listDetail) return
    const trimmed = descriptionDraft.trim()
    const current = listDetail.description || ''
    if (trimmed && countWords(trimmed) > 50) {
      pushAlert({ type: 'error', title: 'Wishlist', message: 'Description must be 50 words or less.' })
      return
    }
    if (trimmed === current) {
      setIsEditingDescription(false)
      return
    }
    await handleUpdateList({ description: trimmed })
    setIsEditingDescription(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !listDetail) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/wishlist/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishlistId: listDetail.id,
          email: inviteEmail.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send invite.')
      }
      setInviteEmail('')
      pushAlert({ type: 'success', title: 'Wishlist', message: 'Invite sent.' })
    } catch (error) {
      pushAlert({ type: 'error', title: 'Wishlist', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const shareVisibility = listDetail?.visibility
  const visibilityLabel = useMemo(
    () => VISIBILITY_OPTIONS.find((item) => item.value === shareVisibility)?.label || 'Private',
    [shareVisibility],
  )

  const handleAddToCartProduct = (productData, quantity = 1) => {
    addItem(productData, Math.max(1, Number(quantity) || 1))
    pushAlert({ type: 'success', title: 'Cart', message: 'Added to cart.' })
  }

  const getCardColor = (id) => {
    const seed = String(id || '')
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return CARD_COLORS[seed % CARD_COLORS.length]
  }

  return (
    <div className='px-3 pt-2 sm:px-4 sm:pt-3 lg:px-5'>
      {!isBootstrapReady ? <WishlistSkeleton /> : null}
      {isBootstrapReady ? (
      <div className='space-y-6'>
      <div>
        <div className='flex items-center gap-3'>
          {!isAllSelected && allListId ? (
            <button
              type='button'
              aria-label='Back'
              onClick={() => setSelectedListId(allListId)}
              className='h-9 w-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='h-4 w-4'
                aria-hidden='true'
              >
                <path d='m12 19-7-7 7-7' />
                <path d='M19 12H5' />
              </svg>
            </button>
          ) : null}
          <h1 className='text-lg font-semibold text-gray-900'>
            {listDetail?.name ? (
              <WishlistListLabel
                name={listDetail.name}
                iconClassName='h-[18px] w-[18px]'
              />
            ) : (
              'Wishlist'
            )}
          </h1>
        </div>
        {isDefaultWishlistName(listDetail?.name) ? (
          <p className='mt-1 text-xs text-gray-500'>
            Saved items you may want to purchase in the future.
          </p>
        ) : isEditingDescription ? (
          <div className='mt-1 flex max-w-xl items-center gap-2'>
            <textarea
              value={descriptionDraft}
              onChange={(event) => {
                const next = clampToMaxWords(event.target.value, 50)
                if (next !== event.target.value) {
                  pushAlert({
                    type: 'error',
                    title: 'Wishlist',
                    message: 'Description is limited to 50 words.',
                  })
                }
                setDescriptionDraft(next)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsEditingDescription(false)
                  setDescriptionDraft(listDetail?.description || '')
                }
              }}
              onBlur={handleSaveDescription}
              placeholder='Describe your list...'
              className='w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none'
              rows={2}
            />
            <span className='text-[10px] text-gray-400'>
              {countWords(descriptionDraft)}/50
            </span>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setIsEditingDescription(true)}
            className='mt-1 inline-flex items-center gap-2 text-left text-sm text-gray-500 hover:text-gray-700'
          >
            {!listDetail?.description ? (
              <>
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                  <path
                    d='M12 20h9'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                  <path
                    d='M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5Z'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinejoin='round'
                  />
                </svg>
                <span>Describe your list...</span>
              </>
            ) : (
              <>
                <span>{listDetail.description}</span>
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                  <path
                    d='M12 20h9'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                  <path
                    d='M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5Z'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinejoin='round'
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      <div className='space-y-4'>
        {isAllSelected ? (
          <section className='rounded-2xl bg-white shadow-sm'>
            <div className='flex flex-wrap items-start gap-3'>
              {orderedLists.map((list) => (
                <button
                  key={list.id}
                  type='button'
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-[140px] rounded-2xl border p-2 text-left ${
                    selectedListId === list.id
                      ? 'border-gray-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className='relative h-24 w-full overflow-hidden rounded-xl bg-gray-100'>
                    <div className='grid h-full grid-cols-2 grid-rows-2 gap-0.5 p-0'>
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className='relative overflow-hidden rounded bg-white/70'>
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
                    {selectedListId === list.id ? (
                      <div className='absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] text-white'>
                        ✓
                      </div>
                    ) : null}
                  </div>
                  <p className='mt-2 text-[10px] font-semibold uppercase text-gray-500'>
                    <WishlistListLabel
                      name={list.name}
                      iconClassName='h-3.5 w-3.5'
                    />
                  </p>
                </button>
              ))}
              <button
                type='button'
                onClick={() => setShowCreateModal(true)}
                className='flex h-[108px] w-[140px] items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400'
                aria-label='Create new list'
              >
                <span className='text-2xl font-semibold'>+</span>
              </button>
            </div>
          </section>
        ) : null}

        <section className='space-y-4'>
          <div className='rounded-2xl bg-white shadow-sm'>
            <div className='flex items-center justify-end'>
              {isLoading ? <span className='text-xs text-gray-500'>Loading...</span> : null}
            </div>
            {isAllSelected ? (
              <div className='mt-4 space-y-6'>
                {groupedLists.map((list) => {
                  const listItems = itemsByList[list.id] || []
                  const cards = mapItemsToCards(listItems)
                  const isCollapsed = Boolean(collapsedLists[list.id])
                  return (
                    <div key={list.id} className='space-y-3'>
                      <button
                        type='button'
                        onClick={() =>
                          setCollapsedLists((prev) => ({
                            ...prev,
                            [list.id]: !prev[list.id],
                          }))
                        }
                        className='flex w-full items-center justify-between text-left'
                      >
                        <div>
                          <p className='text-sm font-semibold text-gray-900'>
                            <WishlistListLabel
                              name={list.name}
                              iconClassName='h-3.5 w-3.5'
                            />
                          </p>
                          <p className='text-xs text-gray-500'>{listItems.length} items</p>
                        </div>
                        <svg
                          className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          aria-hidden='true'
                        >
                          <path d='m6 9 6 6 6-6' />
                        </svg>
                      </button>
                      {!isCollapsed ? (
                        <div className='grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5'>
                          {cards.map((product) => (
                            <ProductCard
                              key={product.wishlistItemId || product.id}
                              product={product}
                              onAddToCart={handleAddToCartProduct}
                              className={`${getCardColor(product.id)} border border-white/70`}
                              wishlistMode
                              showTopAddToCart
                              onRemove={() => {
                                if (product.wishlistItemId) handleRemoveItem(product.wishlistItemId)
                              }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : wishlistProductCards.length ? (
              <div className='mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5'>
                {wishlistProductCards.map((product) => (
                  <ProductCard
                    key={product.wishlistItemId || product.id}
                    product={product}
                    onAddToCart={handleAddToCartProduct}
                    className={`${getCardColor(product.id)} border border-white/70`}
                    wishlistMode
                    showTopAddToCart
                    onRemove={() => {
                      if (product.wishlistItemId) handleRemoveItem(product.wishlistItemId)
                    }}
                  />
                ))}
              </div>
            ) : null}
            {!items.length && !isLoading ? (
              <p className='text-sm text-gray-500'>No items in this list yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
      ) : null}
    {showCreateModal ? (
      <div className='fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4'>
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
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder='List name'
              className='w-full rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10'
            />
            <div>
              <textarea
                value={newListDescription}
                onChange={(event) => {
                  const next = clampToMaxWords(event.target.value, 50)
                  if (next !== event.target.value) {
                    pushAlert({
                      type: 'error',
                      title: 'Wishlist',
                      message: 'Description is limited to 50 words.',
                    })
                  }
                  setNewListDescription(next)
                }}
                placeholder='Description (optional)'
                className='w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                rows={2}
              />
              <div className='mt-1 text-[10px] text-gray-400'>
                {countWords(newListDescription)}/50 words
              </div>
            </div>
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
              disabled={isLoading}
              className='w-full rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60'
            >
              Create
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </div>
  )
}
