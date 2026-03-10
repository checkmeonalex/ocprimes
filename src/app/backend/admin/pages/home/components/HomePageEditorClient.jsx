'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import CustomSelect from '@/components/common/CustomSelect'
import ProductImageLibraryModal from '@/app/backend/admin/products/ProductImageLibraryModal.jsx'
import ProductPickerModal from '@/app/backend/admin/components/ProductPickerModal.jsx'
import HomeStoriesEditor from '@/app/backend/admin/categories/components/HomeStoriesEditor.jsx'
import HomeHeroSliderEditor from './HomeHeroSliderEditor.jsx'
import HomeBrowseCardsEditor from './HomeBrowseCardsEditor.jsx'
import HomeHotspotEditor from './HomeHotspotEditor.jsx'
import HomeLogoGridEditor from './HomeLogoGridEditor.jsx'
import { HOME_LAYOUT_KEYS, normalizeHomeLayoutOrder } from '@/lib/home/schema'

const createDraftLayout = (order = 0) => ({
  id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  image_url: '',
  image_key: '',
  image_alt: '',
  sort_order: order,
  hotspots: [],
})

const EMPTY_BROWSE_CARDS = {
  all: [],
  men: [],
  women: [],
}

const EMPTY_LOGO_GRID = {
  id: '',
  title: '',
  title_bg_color: '#111827',
  title_text_color: '#ffffff',
  items: [],
}

const STORY_TITLE_LIMIT = 80
const STORY_ALT_LIMIT = 300

const normalizeStoryText = (value, limit) => String(value || '').trim().slice(0, limit)

const EMPTY_HOME_FORM = {
  featured_strip_image_url: '',
  featured_strip_image_key: '',
  featured_strip_title_main: '',
  featured_strip_category_id: '',
  featured_strip_tag_id: '',
  hotspot_title_main: '',
  browse_categories_title: '',
  home_catalog_title: '',
  home_catalog_description: '',
  home_catalog_filter_mode: 'none',
  home_catalog_category_id: '',
  home_catalog_tag_id: '',
  home_catalog_limit: 12,
}

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)
  return { response, payload }
}

const normalizeBrowseCards = (items = []) => {
  const grouped = {
    all: [],
    men: [],
    women: [],
  }

  ;(Array.isArray(items) ? items : []).forEach((item) => {
    const segment = String(item?.segment || '').toLowerCase()
    if (!['all', 'men', 'women'].includes(segment)) return
    grouped[segment].push({
      id: item.id || item.image_key || item.image_url || `${segment}-${Date.now()}`,
      name: item.name || '',
      link: item.link || '',
      image_url: item.image_url || '',
      image_key: item.image_key || '',
      image_alt: item.image_alt || '',
    })
  })

  return grouped
}

const flattenBrowseCards = (cards) =>
  ['all', 'men', 'women'].flatMap((segment) =>
    (Array.isArray(cards?.[segment]) ? cards[segment] : [])
      .filter((item) => item?.image_url && item?.name)
      .map((item) => ({
        segment,
        name: String(item.name || '').trim(),
        link: String(item.link || '').trim(),
        image_url: item.image_url,
        image_key: item.image_key || null,
        image_alt: item.image_alt || item.name || '',
      })),
  )

const moveLayoutKey = (order, key, direction) => {
  const current = normalizeHomeLayoutOrder(order)
  const index = current.indexOf(key)
  if (index === -1) return current

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= current.length) return current

  const next = [...current]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export default function HomePageEditorClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [homePage, setHomePage] = useState(null)
  const [form, setForm] = useState(EMPTY_HOME_FORM)
  const [layoutOrder, setLayoutOrder] = useState(HOME_LAYOUT_KEYS.slice())
  const [featureFilterType, setFeatureFilterType] = useState('none')
  const [desktopSlides, setDesktopSlides] = useState([])
  const [desktopSlideKeys, setDesktopSlideKeys] = useState([])
  const [mobileSlides, setMobileSlides] = useState([])
  const [mobileSlideKeys, setMobileSlideKeys] = useState([])
  const [slideLinks, setSlideLinks] = useState([])
  const [activeSliderDevice, setActiveSliderDevice] = useState('desktop')
  const [savingHome, setSavingHome] = useState(false)
  const [hotspotLayouts, setHotspotLayouts] = useState([])
  const [activeLayoutId, setActiveLayoutId] = useState('')
  const [hotspotLoading, setHotspotLoading] = useState(false)
  const [hotspotSaving, setHotspotSaving] = useState(false)
  const [hotspotError, setHotspotError] = useState('')
  const [activeHotspotId, setActiveHotspotId] = useState('')
  const [pendingHotspotId, setPendingHotspotId] = useState('')
  const [showHotspotPicker, setShowHotspotPicker] = useState(false)
  const [logoGrid, setLogoGrid] = useState(EMPTY_LOGO_GRID)
  const [logoGridLoading, setLogoGridLoading] = useState(false)
  const [logoGridSaving, setLogoGridSaving] = useState(false)
  const [logoGridError, setLogoGridError] = useState('')
  const [storiesItems, setStoriesItems] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [storiesSaving, setStoriesSaving] = useState(false)
  const [storiesError, setStoriesError] = useState('')
  const [browseCards, setBrowseCards] = useState(EMPTY_BROWSE_CARDS)
  const [browseCardsLoading, setBrowseCardsLoading] = useState(false)
  const [browseCardsSaving, setBrowseCardsSaving] = useState(false)
  const [browseCardsError, setBrowseCardsError] = useState('')
  const [activeBrowseSegment, setActiveBrowseSegment] = useState('all')
  const [categoryOptions, setCategoryOptions] = useState([])
  const [tags, setTags] = useState([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [tagsLoading, setTagsLoading] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryContext, setLibraryContext] = useState({
    type: 'slider',
    index: 0,
    device: 'desktop',
  })
  const activeLayout =
    hotspotLayouts.find((layout) => layout.id === activeLayoutId) ||
    hotspotLayouts[0] ||
    null

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError('')
      setSaveMessage('')
      setStoriesLoading(true)
      setBrowseCardsLoading(true)
      setChildrenLoading(true)
      setTagsLoading(true)

      try {
        const [
          homeRes,
          storiesRes,
          browseRes,
          treeRes,
          filtersRes,
          tagsRes,
        ] = await Promise.all([
          requestJson('/api/admin/home'),
          requestJson('/api/admin/home/stories'),
          requestJson('/api/admin/home/browse-cards'),
          requestJson('/api/admin/categories/tree?limit=500'),
          requestJson('/api/admin/product-filters?status=publish'),
          requestJson('/api/admin/tags?per_page=50'),
        ])

        if (!homeRes.response.ok) {
          throw new Error(homeRes.payload?.error || 'Unable to load homepage settings.')
        }

        const homeItem = homeRes.payload?.item || null
        if (!mounted) return

        setHomePage(homeItem)
        setForm({
          featured_strip_image_url: homeItem?.featured_strip_image_url || '',
          featured_strip_image_key: homeItem?.featured_strip_image_key || '',
          featured_strip_title_main: homeItem?.featured_strip_title_main || '',
          featured_strip_category_id: homeItem?.featured_strip_category_id || '',
          featured_strip_tag_id: homeItem?.featured_strip_tag_id || '',
          hotspot_title_main: homeItem?.hotspot_title_main || '',
          browse_categories_title: homeItem?.browse_categories_title || '',
          home_catalog_title: homeItem?.home_catalog_title || '',
          home_catalog_description: homeItem?.home_catalog_description || '',
          home_catalog_filter_mode: homeItem?.home_catalog_filter_mode || 'none',
          home_catalog_category_id: homeItem?.home_catalog_category_id || '',
          home_catalog_tag_id: homeItem?.home_catalog_tag_id || '',
          home_catalog_limit: Number(homeItem?.home_catalog_limit) > 0 ? Number(homeItem.home_catalog_limit) : 12,
        })
        setLayoutOrder(normalizeHomeLayoutOrder(homeItem?.layout_order))
        setFeatureFilterType(
          homeItem?.featured_strip_tag_id ? 'tag' : homeItem?.featured_strip_category_id ? 'category' : 'none',
        )
        setDesktopSlides(Array.isArray(homeItem?.banner_slider_urls) ? homeItem.banner_slider_urls.slice(0, 5) : [])
        setDesktopSlideKeys(
          Array.isArray(homeItem?.banner_slider_keys) ? homeItem.banner_slider_keys.slice(0, 5) : [],
        )
        setMobileSlides(
          Array.isArray(homeItem?.banner_slider_mobile_urls) ? homeItem.banner_slider_mobile_urls.slice(0, 5) : [],
        )
        setMobileSlideKeys(
          Array.isArray(homeItem?.banner_slider_mobile_keys)
            ? homeItem.banner_slider_mobile_keys.slice(0, 5)
            : [],
        )
        setSlideLinks(Array.isArray(homeItem?.banner_slider_links) ? homeItem.banner_slider_links.slice(0, 5) : [])

        if (homeItem?.legacy_category_id) {
          setHotspotLoading(true)
          setLogoGridLoading(true)
          const [hotspotRes, logoRes] = await Promise.all([
            requestJson(`/api/admin/categories/${homeItem.legacy_category_id}/hotspot`),
            requestJson(`/api/admin/categories/${homeItem.legacy_category_id}/logo-grid`),
          ])

          if (hotspotRes.response.ok) {
            const items = Array.isArray(hotspotRes.payload?.items) ? hotspotRes.payload.items : []
            setHotspotLayouts(items)
            setActiveLayoutId(items[0]?.id || '')
            setHotspotError('')
          } else {
            setHotspotLayouts([])
            setActiveLayoutId('')
            setHotspotError(hotspotRes.payload?.error || 'Unable to load hotspot layout.')
          }

          if (logoRes.response.ok) {
            const item = logoRes.payload?.item || EMPTY_LOGO_GRID
            setLogoGrid({
              ...item,
              title_bg_color: item?.title_bg_color || '#111827',
              title_text_color: item?.title_text_color || '#ffffff',
              items: Array.isArray(item?.items) ? item.items : [],
            })
            setLogoGridError('')
          } else {
            setLogoGrid(EMPTY_LOGO_GRID)
            setLogoGridError(logoRes.payload?.error || 'Unable to load logo grid.')
          }

          setHotspotLoading(false)
          setLogoGridLoading(false)
        } else {
          setHotspotLayouts([])
          setActiveLayoutId('')
          setLogoGrid(EMPTY_LOGO_GRID)
        }

        if (storiesRes.response.ok) {
          setStoriesItems(Array.isArray(storiesRes.payload?.items) ? storiesRes.payload.items : [])
          setStoriesError('')
        } else {
          setStoriesItems([])
          setStoriesError(storiesRes.payload?.error || 'Unable to load stories.')
        }

        if (browseRes.response.ok) {
          setBrowseCards(normalizeBrowseCards(browseRes.payload?.items || []))
          setBrowseCardsError('')
        } else {
          setBrowseCards(EMPTY_BROWSE_CARDS)
          setBrowseCardsError(browseRes.payload?.error || 'Unable to load browse cards.')
        }

        const categoryIds = Array.isArray(filtersRes.payload?.category_ids)
          ? filtersRes.payload.category_ids
          : []
        if (treeRes.response.ok && Array.isArray(treeRes.payload?.items)) {
          const filtered = categoryIds.length
            ? treeRes.payload.items.filter((item) => categoryIds.includes(item.id))
            : treeRes.payload.items
          setCategoryOptions(filtered)
        } else {
          setCategoryOptions([])
        }

        if (tagsRes.response.ok && Array.isArray(tagsRes.payload?.items)) {
          setTags(tagsRes.payload.items)
        } else {
          setTags([])
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load homepage editor.')
      } finally {
        if (mounted) {
          setLoading(false)
          setHotspotLoading(false)
          setLogoGridLoading(false)
          setStoriesLoading(false)
          setBrowseCardsLoading(false)
          setChildrenLoading(false)
          setTagsLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const legacyCategoryId = homePage?.legacy_category_id || ''

  const selectedLibraryImages = useMemo(() => {
    if (libraryContext.type === 'featured' && form.featured_strip_image_url) {
      return [
        {
          id: form.featured_strip_image_key || form.featured_strip_image_url,
          url: form.featured_strip_image_url,
          r2_key: form.featured_strip_image_key || '',
          alt_text: form.featured_strip_title_main || 'Featured strip',
          title: form.featured_strip_title_main || 'Featured strip',
        },
      ]
    }

    if (libraryContext.type === 'stories') {
      const targetId = String(libraryContext.index || '').trim()
      const story = storiesItems.find((item) => item.id === targetId)
      if (story?.media_type === 'image' && story.media_url) {
        return [
          {
            id: story.id,
            url: story.media_url,
            r2_key: story.media_key || '',
            alt_text: story.media_alt || story.title || 'Story',
            title: story.title || 'Story',
          },
        ]
      }
      return []
    }

    if (String(libraryContext.type || '').startsWith('browse-')) {
      const segment = String(libraryContext.type || '').replace('browse-', '')
      const cardId = String(libraryContext.index || '').trim()
      const card = (browseCards?.[segment] || []).find((item) => item.id === cardId)
      if (!card?.image_url) return []
      return [
        {
          id: card.id,
          url: card.image_url,
          r2_key: card.image_key || '',
          alt_text: card.image_alt || card.name || 'Browse card',
          title: card.name || 'Browse card',
        },
      ]
    }

    if (libraryContext.type === 'slider') {
      const index = Number(libraryContext.index) || 0
      const isMobile = libraryContext.device === 'mobile'
      const url = isMobile ? mobileSlides[index] : desktopSlides[index]
      const key = isMobile ? mobileSlideKeys[index] : desktopSlideKeys[index]
      if (!url) return []
      return [
        {
          id: key || url,
          url,
          r2_key: key || '',
          alt_text: `Slide ${index + 1}`,
          title: `Slide ${index + 1}`,
        },
      ]
    }

    return []
  }, [
    browseCards,
    desktopSlideKeys,
    desktopSlides,
    form.featured_strip_image_key,
    form.featured_strip_image_url,
    form.featured_strip_title_main,
    libraryContext.device,
    libraryContext.index,
    libraryContext.type,
    mobileSlideKeys,
    mobileSlides,
    storiesItems,
  ])

  const selectedLibraryVideo = useMemo(() => {
    if (libraryContext.type !== 'stories') return { id: '', url: '' }
    const targetId = String(libraryContext.index || '').trim()
    const story = storiesItems.find((item) => item.id === targetId)
    if (story?.media_type !== 'video') return { id: '', url: '' }
    return {
      id: story.media_key || story.id || story.media_url,
      url: story.media_url || '',
    }
  }, [libraryContext.index, libraryContext.type, storiesItems])

  const handlePickSlide = (index, device) => {
    setLibraryContext({ type: 'slider', index, device })
    setShowLibrary(true)
  }

  const handleRemoveSlide = (index, device) => {
    if (device === 'mobile') {
      setMobileSlides((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
      setMobileSlideKeys((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
      return
    }

    setDesktopSlides((prev) => {
      const next = [...prev]
      next[index] = ''
      return next
    })
    setDesktopSlideKeys((prev) => {
      const next = [...prev]
      next[index] = ''
      return next
    })
  }

  const handleSlideLinkChange = (index, value) => {
    setSlideLinks((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleStoryItemChange = (storyId, field, value) => {
    setStoriesItems((prev) =>
      prev.map((item) =>
        item.id === storyId
          ? {
              ...item,
              [field]:
                field === 'title'
                  ? normalizeStoryText(value, STORY_TITLE_LIMIT)
                  : field === 'media_alt'
                    ? normalizeStoryText(value, STORY_ALT_LIMIT)
                    : value,
            }
          : item,
      ),
    )
  }

  const handleRemoveStoryItem = (storyId) => {
    setStoriesItems((prev) => prev.filter((item) => item.id !== storyId))
  }

  const handleBrowseCardChange = (segment, cardId, field, value) => {
    setBrowseCards((prev) => ({
      ...prev,
      [segment]: (Array.isArray(prev?.[segment]) ? prev[segment] : []).map((item) =>
        item.id === cardId ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleRemoveBrowseCard = (segment, cardId) => {
    setBrowseCards((prev) => ({
      ...prev,
      [segment]: (Array.isArray(prev?.[segment]) ? prev[segment] : []).filter((item) => item.id !== cardId),
    }))
  }

  const handleClearBrowseSegment = (segment) => {
    setBrowseCards((prev) => ({
      ...prev,
      [segment]: [],
    }))
  }

  const handleSelectHotspotSlide = (layoutId) => {
    setActiveLayoutId(layoutId)
    setActiveHotspotId('')
    setPendingHotspotId('')
    setHotspotError('')
  }

  const handleAddHotspotSlide = () => {
    const draft = createDraftLayout(hotspotLayouts.length)
    setHotspotLayouts((prev) => [...prev, draft])
    setActiveLayoutId(draft.id)
    setHotspotError('')
  }

  const handleHotspotCanvasClick = (event) => {
    if (!activeLayout?.id) {
      setHotspotError('Add a slide first.')
      return
    }
    if (!activeLayout?.image_url) {
      setLibraryContext({ type: 'hotspot', index: 0, device: 'desktop' })
      setShowLibrary(true)
      return
    }
    if ((activeLayout.hotspots || []).length >= 10) {
      setHotspotError('Maximum of 10 hotspots.')
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const rawX = ((event.clientX - rect.left) / rect.width) * 100
    const rawY = ((event.clientY - rect.top) / rect.height) * 100
    const x = Math.min(100, Math.max(0, rawX))
    const y = Math.min(100, Math.max(0, rawY))
    const nextId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? {
              ...layout,
              hotspots: [
                ...(Array.isArray(layout.hotspots) ? layout.hotspots : []),
                {
                  id: nextId,
                  x,
                  y,
                  product_id: '',
                  product: null,
                },
              ],
            }
          : layout,
      ),
    )
    setHotspotError('')
    setActiveHotspotId(nextId)
    setPendingHotspotId(nextId)
    setShowHotspotPicker(true)
  }

  const handleHotspotEdit = (hotspotId) => {
    setActiveHotspotId(hotspotId)
    setPendingHotspotId('')
    setShowHotspotPicker(true)
  }

  const handleHotspotRemove = (hotspotId) => {
    if (!activeLayout?.id) return
    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? {
              ...layout,
              hotspots: (Array.isArray(layout.hotspots) ? layout.hotspots : []).filter(
                (hotspot) => hotspot.id !== hotspotId,
              ),
            }
          : layout,
      ),
    )
    if (activeHotspotId === hotspotId) setActiveHotspotId('')
    if (pendingHotspotId === hotspotId) setPendingHotspotId('')
  }

  const handleHotspotProductSelect = (product) => {
    if (!product || !activeHotspotId || !activeLayout?.id) {
      setShowHotspotPicker(false)
      return
    }

    setHotspotLayouts((prev) =>
      prev.map((layout) =>
        layout.id === activeLayout.id
          ? {
              ...layout,
              hotspots: (Array.isArray(layout.hotspots) ? layout.hotspots : []).map((hotspot) =>
                hotspot.id === activeHotspotId
                  ? {
                      ...hotspot,
                      product_id: product.id,
                      product: {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        discount_price: product.discount_price,
                        image_url: product.image_url,
                      },
                    }
                  : hotspot,
              ),
            }
          : layout,
      ),
    )
    setShowHotspotPicker(false)
    setPendingHotspotId('')
    setActiveHotspotId('')
  }

  const handleHotspotPickerClose = () => {
    setShowHotspotPicker(false)
    if (pendingHotspotId && activeLayout?.id) {
      setHotspotLayouts((prev) =>
        prev.map((layout) =>
          layout.id === activeLayout.id
            ? {
                ...layout,
                hotspots: (Array.isArray(layout.hotspots) ? layout.hotspots : []).filter(
                  (hotspot) => hotspot.id !== pendingHotspotId || hotspot.product_id,
                ),
              }
            : layout,
        ),
      )
    }
    setPendingHotspotId('')
    setActiveHotspotId('')
  }

  const handleSaveHotspotLayout = async () => {
    if (!legacyCategoryId) return
    if (!activeLayout?.id) {
      setHotspotError('Add a slide first.')
      return
    }
    if (!activeLayout?.image_url) {
      setHotspotError('Select an image first.')
      return
    }

    setHotspotSaving(true)
    setHotspotError('')
    const sanitizedHotspots = (Array.isArray(activeLayout.hotspots) ? activeLayout.hotspots : [])
      .filter((hotspot) => hotspot.product_id)
      .slice(0, 10)
      .map((hotspot) => ({
        id: hotspot.id,
        x: Number(hotspot.x),
        y: Number(hotspot.y),
        product_id: hotspot.product_id,
      }))

    const { response, payload } = await requestJson(
      `/api/admin/categories/${legacyCategoryId}/hotspot`,
      {
        method: 'PUT',
        body: JSON.stringify({
          layout_id: String(activeLayout.id).startsWith('temp-') ? undefined : activeLayout.id,
          sort_order: activeLayout.sort_order,
          image_url: activeLayout.image_url,
          image_key: activeLayout.image_key || null,
          image_alt: activeLayout.image_alt || form.hotspot_title_main || 'Hotspot',
          hotspots: sanitizedHotspots,
        }),
      },
    )

    if (!response.ok) {
      setHotspotSaving(false)
      setHotspotError(payload?.error || 'Unable to save hotspot layout.')
      return
    }

    const saved = payload?.item || null
    if (saved?.id) {
      setHotspotLayouts((prev) =>
        prev.map((layout) => (layout.id === activeLayout.id ? saved : layout)),
      )
      setActiveLayoutId(saved.id)
    }
    setHotspotSaving(false)
  }

  const handleRemoveHotspotLayout = async () => {
    if (!legacyCategoryId || !activeLayout?.id) return

    setHotspotSaving(true)
    setHotspotError('')
    const layoutId = activeLayout.id

    if (String(layoutId).startsWith('temp-')) {
      const remaining = hotspotLayouts.filter((layout) => layout.id !== layoutId)
      setHotspotLayouts(remaining)
      setActiveLayoutId(remaining[0]?.id || '')
      setHotspotSaving(false)
      return
    }

    const { response, payload } = await requestJson(
      `/api/admin/categories/${legacyCategoryId}/hotspot?layout_id=${layoutId}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      setHotspotSaving(false)
      setHotspotError(payload?.error || 'Unable to remove hotspot layout.')
      return
    }

    const remaining = hotspotLayouts.filter((layout) => layout.id !== layoutId)
    setHotspotLayouts(remaining)
    setActiveLayoutId(remaining[0]?.id || '')
    setHotspotSaving(false)
  }

  const handleSaveLogoGrid = async () => {
    if (!legacyCategoryId) return
    setLogoGridSaving(true)
    setLogoGridError('')

    const payloadItems = (Array.isArray(logoGrid.items) ? logoGrid.items : []).map((item) => ({
      image_url: item.image_url,
      image_key: item.image_key || null,
      image_alt: item.image_alt || null,
    }))

    const { response, payload } = await requestJson(
      `/api/admin/categories/${legacyCategoryId}/logo-grid`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: logoGrid.title || null,
          title_bg_color: logoGrid.title_bg_color || null,
          title_text_color: logoGrid.title_text_color || null,
          items: payloadItems,
        }),
      },
    )

    if (!response.ok) {
      setLogoGridSaving(false)
      setLogoGridError(payload?.error || 'Unable to save logo grid.')
      return
    }

    const item = payload?.item || EMPTY_LOGO_GRID
    setLogoGrid({
      ...item,
      title_bg_color: item?.title_bg_color || '#111827',
      title_text_color: item?.title_text_color || '#ffffff',
      items: Array.isArray(item?.items) ? item.items : [],
    })
    setLogoGridSaving(false)
  }

  const handleRemoveLogoItem = (id) => {
    setLogoGrid((prev) => ({
      ...prev,
      items: (Array.isArray(prev.items) ? prev.items : []).filter((item) => item.id !== id),
    }))
  }

  const handleClearLogoGrid = async () => {
    if (!legacyCategoryId) return
    setLogoGridSaving(true)
    setLogoGridError('')

    const { response, payload } = await requestJson(
      `/api/admin/categories/${legacyCategoryId}/logo-grid`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      setLogoGridSaving(false)
      setLogoGridError(payload?.error || 'Unable to remove logo grid.')
      return
    }

    setLogoGrid(EMPTY_LOGO_GRID)
    setLogoGridSaving(false)
  }

  const handleSaveHome = async () => {
    setSavingHome(true)
    setError('')
    setSaveMessage('')

    const nextCategoryId =
      featureFilterType === 'category' ? String(form.featured_strip_category_id || '').trim() : ''
    const nextTagId =
      featureFilterType === 'tag' ? String(form.featured_strip_tag_id || '').trim() : ''
    const payload = {
      banner_slider_urls: Array.from({ length: 5 }).map((_, index) =>
        String(desktopSlides[index] || '').trim(),
      ),
      banner_slider_keys: desktopSlideKeys.slice(0, 5).map((value) => String(value || '').trim()),
      banner_slider_mobile_urls: Array.from({ length: 5 }).map((_, index) =>
        String(mobileSlides[index] || '').trim(),
      ),
      banner_slider_mobile_keys: mobileSlideKeys.slice(0, 5).map((value) => String(value || '').trim()),
      banner_slider_links: Array.from({ length: 5 }).map((_, index) => String(slideLinks[index] || '').trim()),
      featured_strip_image_url: String(form.featured_strip_image_url || '').trim() || null,
      featured_strip_image_key: String(form.featured_strip_image_key || '').trim() || null,
      featured_strip_title_main: String(form.featured_strip_title_main || '').trim() || null,
      featured_strip_category_id: nextCategoryId || null,
      featured_strip_tag_id: nextTagId || null,
      hotspot_title_main: String(form.hotspot_title_main || '').trim() || null,
      browse_categories_title: String(form.browse_categories_title || '').trim() || null,
      home_catalog_title: String(form.home_catalog_title || '').trim() || null,
      home_catalog_description: String(form.home_catalog_description || '').trim() || null,
      home_catalog_filter_mode: form.home_catalog_filter_mode,
      home_catalog_category_id:
        form.home_catalog_filter_mode === 'category'
          ? String(form.home_catalog_category_id || '').trim() || null
          : null,
      home_catalog_tag_id:
        form.home_catalog_filter_mode === 'tag'
          ? String(form.home_catalog_tag_id || '').trim() || null
          : null,
      home_catalog_limit: Number(form.home_catalog_limit) || 12,
      layout_order: normalizeHomeLayoutOrder(layoutOrder),
    }

    const { response, payload: result } = await requestJson('/api/admin/home', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      setSavingHome(false)
      setError(result?.error || 'Unable to save homepage settings.')
      return
    }

    const item = result?.item || null
    setHomePage(item)
    setLayoutOrder(normalizeHomeLayoutOrder(item?.layout_order))
    setSaveMessage('Homepage settings saved.')
    setSavingHome(false)
  }

  const handleSaveStories = async () => {
    setStoriesSaving(true)
    setStoriesError('')

    const payload = {
      items: (Array.isArray(storiesItems) ? storiesItems : [])
        .filter((item) => item?.media_url && item?.title)
        .map((item) => ({
          title: normalizeStoryText(item.title, STORY_TITLE_LIMIT),
          media_type: item.media_type,
          media_url: item.media_url,
          media_key: item.media_key || null,
          media_alt: normalizeStoryText(item.media_alt || item.title || '', STORY_ALT_LIMIT),
        })),
    }

    const { response, payload: result } = await requestJson('/api/admin/home/stories', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      setStoriesSaving(false)
      setStoriesError(result?.error || 'Unable to save stories.')
      return
    }

    setStoriesItems(Array.isArray(result?.items) ? result.items : [])
    setStoriesSaving(false)
  }

  const handleSaveBrowseCards = async () => {
    setBrowseCardsSaving(true)
    setBrowseCardsError('')

    const { response, payload } = await requestJson('/api/admin/home/browse-cards', {
      method: 'PUT',
      body: JSON.stringify({
        items: flattenBrowseCards(browseCards),
      }),
    })

    if (!response.ok) {
      setBrowseCardsSaving(false)
      setBrowseCardsError(payload?.error || 'Unable to save browse cards.')
      return
    }

    setBrowseCards(normalizeBrowseCards(payload?.items || []))
    setBrowseCardsSaving(false)
  }

  const handleLibraryApply = ({ gallery, videos }) => {
    if (libraryContext.type === 'stories') {
      const imageItems = Array.isArray(gallery) ? gallery : []
      const videoItems = Array.isArray(videos) ? videos : []
      const targetId = String(libraryContext.index || '').trim()
      const storyMediaItems = [
        ...videoItems.map((item) => ({
          media_type: 'video',
          media_url: item.url,
          media_key: item.r2_key || item.key || null,
          media_alt: normalizeStoryText(item.title || '', STORY_ALT_LIMIT),
          title: normalizeStoryText(item.title || 'Story', STORY_TITLE_LIMIT),
        })),
        ...imageItems.map((item) => ({
          media_type: 'image',
          media_url: item.url,
          media_key: item.r2_key || item.key || null,
          media_alt: normalizeStoryText(item.alt_text || item.title || '', STORY_ALT_LIMIT),
          title: normalizeStoryText(item.alt_text || item.title || 'Story', STORY_TITLE_LIMIT),
        })),
      ].filter((item) => item.media_url)

      if (storyMediaItems.length) {
        setStoriesItems((prev) => {
          if (targetId) {
            const replacement = storyMediaItems[0]
            return prev.map((story) =>
              story.id === targetId
                ? {
                    ...story,
                    ...replacement,
                  }
                : story,
            )
          }

          const seen = new Set(
            prev.map((story) => String(story?.media_key || story?.media_url || '').trim()).filter(Boolean),
          )
          const nextItems = [...prev]
          storyMediaItems.forEach((item) => {
            const fingerprint = String(item.media_key || item.media_url || '').trim()
            if (!fingerprint || seen.has(fingerprint)) return
            seen.add(fingerprint)
            nextItems.push({
              id:
                item.media_key ||
                item.media_url ||
                `story-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              ...item,
            })
          })
          return nextItems.slice(0, 24)
        })
      }

      setShowLibrary(false)
      return
    }

    if (String(libraryContext.type || '').startsWith('browse-')) {
      const segment = String(libraryContext.type).replace('browse-', '')
      const images = Array.isArray(gallery) ? gallery : []
      const targetId = String(libraryContext.index || '').trim()

      if (targetId) {
        const first = images[0]
        if (first) {
          setBrowseCards((prev) => ({
            ...prev,
            [segment]: (Array.isArray(prev?.[segment]) ? prev[segment] : []).map((card) =>
              card.id === targetId
                ? {
                    ...card,
                    image_url: first.url,
                    image_key: first.r2_key || first.key || '',
                    image_alt: first.alt_text || first.title || card.name || '',
                    name: card.name || first.alt_text || first.title || 'Category',
                  }
                : card,
            ),
          }))
        }
        setShowLibrary(false)
        return
      }

      const mapped = images
        .filter((entry) => entry?.url)
        .map((entry) => ({
          id: entry.id || entry.r2_key || entry.url,
          name: entry.alt_text || entry.title || 'Category',
          link: '',
          image_url: entry.url,
          image_key: entry.r2_key || entry.key || '',
          image_alt: entry.alt_text || entry.title || '',
        }))

      setBrowseCards((prev) => {
        const existing = Array.isArray(prev?.[segment]) ? prev[segment] : []
        const seen = new Set(existing.map((card) => card.image_key || card.image_url))
        const nextItems = [...existing]
        mapped.forEach((card) => {
          const fingerprint = card.image_key || card.image_url
          if (seen.has(fingerprint)) return
          seen.add(fingerprint)
          nextItems.push(card)
        })
        return {
          ...prev,
          [segment]: nextItems.slice(0, 24),
        }
      })

      setShowLibrary(false)
      return
    }

    if (libraryContext.type === 'logo-grid') {
      const galleryItems = Array.isArray(gallery) ? gallery : []
      const mapped = galleryItems
        .filter((entry) => entry?.url)
        .map((entry) => ({
          id: entry.id || entry.r2_key || entry.url,
          image_url: entry.url,
          image_key: entry.r2_key || entry.key || '',
          image_alt: entry.alt_text || entry.title || '',
        }))

      setLogoGrid((prev) => {
        const existing = Array.isArray(prev.items) ? prev.items : []
        const seen = new Set(existing.map((item) => item.image_key || item.image_url))
        const nextItems = [...existing]
        mapped.forEach((item) => {
          const fingerprint = item.image_key || item.image_url
          if (seen.has(fingerprint)) return
          seen.add(fingerprint)
          nextItems.push(item)
        })
        return {
          ...prev,
          items: nextItems.slice(0, 60),
        }
      })

      setShowLibrary(false)
      return
    }

    const first = Array.isArray(gallery) ? gallery[0] : null
    if (!first) {
      setShowLibrary(false)
      return
    }

    if (libraryContext.type === 'featured') {
      setForm((prev) => ({
        ...prev,
        featured_strip_image_url: first.url,
        featured_strip_image_key: first.r2_key || first.key || '',
      }))
      setShowLibrary(false)
      return
    }

    if (libraryContext.type === 'hotspot') {
      if (!activeLayout?.id) {
        const draft = createDraftLayout(hotspotLayouts.length)
        setHotspotLayouts((prev) => [
          ...prev,
          {
            ...draft,
            image_url: first.url,
            image_key: first.r2_key || first.key || '',
            image_alt: form.hotspot_title_main || 'Hotspot',
          },
        ])
        setActiveLayoutId(draft.id)
      } else {
        setHotspotLayouts((prev) =>
          prev.map((layout) =>
            layout.id === activeLayout.id
              ? {
                  ...layout,
                  image_url: first.url,
                  image_key: first.r2_key || first.key || '',
                  image_alt: form.hotspot_title_main || 'Hotspot',
                }
              : layout,
          ),
        )
      }
      setShowLibrary(false)
      return
    }

    if (libraryContext.type === 'slider') {
      const index = Number(libraryContext.index) || 0
      if (libraryContext.device === 'mobile') {
        setMobileSlides((prev) => {
          const next = [...prev]
          next[index] = first.url
          return next
        })
        setMobileSlideKeys((prev) => {
          const next = [...prev]
          next[index] = first.r2_key || first.key || ''
          return next
        })
      } else {
        setDesktopSlides((prev) => {
          const next = [...prev]
          next[index] = first.url
          return next
        })
        setDesktopSlideKeys((prev) => {
          const next = [...prev]
          next[index] = first.r2_key || first.key || ''
          return next
        })
      }
      setShowLibrary(false)
    }
  }

  if (loading) {
    return (
      <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <p className='text-sm text-slate-500'>Loading homepage editor...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <p className='text-xs font-semibold uppercase tracking-[0.4em] text-slate-400'>Pages</p>
        <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Home</h1>
        <p className='mt-3 max-w-3xl text-sm text-slate-500'>
          This editor owns the homepage as an independent page. Hero, stories, browse cards,
          featured strip config, catalog config, and section order now live here instead of on the
          category record.
        </p>

        <div className='mt-5 flex flex-wrap gap-3'>
          <Link
            href='/'
            className='inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
          >
            Preview homepage
          </Link>
        </div>

        {error ? (
          <div className='mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}
        {saveMessage ? <p className='mt-4 text-sm text-emerald-600'>{saveMessage}</p> : null}
      </section>

      <HomeHeroSliderEditor
        desktopSlides={desktopSlides}
        mobileSlides={mobileSlides}
        slideLinks={slideLinks}
        activeDevice={activeSliderDevice}
        saving={savingHome}
        onDeviceChange={setActiveSliderDevice}
        onPickSlide={handlePickSlide}
        onRemoveSlide={handleRemoveSlide}
        onLinkChange={handleSlideLinkChange}
        onSave={handleSaveHome}
      />

      <section className='grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'>
        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-semibold text-slate-800'>Featured strip</p>
              <p className='text-xs text-slate-500'>
                Configure the strip image, content source, and title.
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => {
                  setLibraryContext({ type: 'featured', index: 0, device: 'desktop' })
                  setShowLibrary(true)
                }}
                className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
              >
                {form.featured_strip_image_url ? 'Replace image' : 'Choose image'}
              </button>
              {form.featured_strip_image_url ? (
                <button
                  type='button'
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      featured_strip_image_url: '',
                      featured_strip_image_key: '',
                    }))
                  }
                  className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50'
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'>
            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-slate-50'>
              {form.featured_strip_image_url ? (
                <img
                  src={form.featured_strip_image_url}
                  alt={form.featured_strip_title_main || 'Featured strip'}
                  className='h-full min-h-48 w-full object-cover'
                />
              ) : (
                <div className='flex min-h-48 items-center justify-center text-xs text-slate-400'>
                  No featured image selected
                </div>
              )}
            </div>

            <div className='space-y-4'>
              <label className='block'>
                <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                  Title
                </span>
                <input
                  value={form.featured_strip_title_main}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, featured_strip_title_main: event.target.value }))
                  }
                  className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
                  placeholder='Premium picks'
                />
              </label>

              <div className='grid gap-4 md:grid-cols-3'>
                <div>
                  <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                    Filter type
                  </label>
                  <CustomSelect
                    value={featureFilterType}
                    onChange={(event) => setFeatureFilterType(event.target.value)}
                    className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
                  >
                    <option value='none'>None</option>
                    <option value='category'>Category</option>
                    <option value='tag'>Tag</option>
                  </CustomSelect>
                </div>

                <div>
                  <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                    Category
                  </label>
                  <CustomSelect
                    value={form.featured_strip_category_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, featured_strip_category_id: event.target.value }))
                    }
                    disabled={featureFilterType !== 'category'}
                    className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50'
                  >
                    <option value=''>
                      {childrenLoading ? 'Loading categories...' : 'Select category'}
                    </option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </CustomSelect>
                </div>

                <div>
                  <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
                    Tag
                  </label>
                  <CustomSelect
                    value={form.featured_strip_tag_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, featured_strip_tag_id: event.target.value }))
                    }
                    disabled={featureFilterType !== 'tag'}
                    className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50'
                  >
                    <option value=''>{tagsLoading ? 'Loading tags...' : 'Select tag'}</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm font-semibold text-slate-800'>Section order</p>
          <p className='mt-1 text-xs text-slate-500'>
            Control the order for featured strip, hotspot section, and logo grid on the homepage.
          </p>

          <div className='mt-4 space-y-3'>
            {layoutOrder.map((key, index) => (
              <div
                key={key}
                className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'
              >
                <div>
                  <p className='text-sm font-semibold text-slate-800'>
                    {key === 'featured_strip'
                      ? 'Featured strip'
                      : key === 'hotspot'
                        ? 'Hotspot'
                        : 'Logo grid'}
                  </p>
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setLayoutOrder((prev) => moveLayoutKey(prev, key, 'up'))}
                    disabled={index === 0}
                    className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40'
                  >
                    Up
                  </button>
                  <button
                    type='button'
                    onClick={() => setLayoutOrder((prev) => moveLayoutKey(prev, key, 'down'))}
                    disabled={index === layoutOrder.length - 1}
                    className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40'
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label className='mt-4 block'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Hotspot title
            </span>
            <input
              value={form.hotspot_title_main}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, hotspot_title_main: event.target.value }))
              }
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
              placeholder='Top picks'
            />
          </label>

          <div className='mt-4 flex items-center gap-3'>
            <button
              type='button'
              onClick={handleSaveHome}
              disabled={savingHome}
              className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
            >
              {savingHome ? 'Saving...' : 'Save home layout'}
            </button>
          </div>
        </div>
      </section>

      <HomeHotspotEditor
        title={form.hotspot_title_main}
        layouts={hotspotLayouts}
        activeLayout={activeLayout}
        loading={hotspotLoading}
        saving={hotspotSaving}
        error={hotspotError}
        onTitleChange={(value) => setForm((prev) => ({ ...prev, hotspot_title_main: value }))}
        onAddSlide={handleAddHotspotSlide}
        onSelectSlide={handleSelectHotspotSlide}
        onChooseImage={() => {
          setLibraryContext({ type: 'hotspot', index: 0, device: 'desktop' })
          setShowLibrary(true)
        }}
        onRemoveSlide={handleRemoveHotspotLayout}
        onImageClick={handleHotspotCanvasClick}
        onEditHotspot={handleHotspotEdit}
        onRemoveHotspot={handleHotspotRemove}
        onSave={handleSaveHotspotLayout}
      />

      <HomeLogoGridEditor
        grid={logoGrid}
        loading={logoGridLoading}
        saving={logoGridSaving}
        error={logoGridError}
        onAddLogos={() => {
          setLibraryContext({ type: 'logo-grid', index: 0, device: 'desktop' })
          setShowLibrary(true)
        }}
        onClear={handleClearLogoGrid}
        onTitleChange={(value) => setLogoGrid((prev) => ({ ...prev, title: value }))}
        onTitleBgColorChange={(value) =>
          setLogoGrid((prev) => ({ ...prev, title_bg_color: value }))
        }
        onTitleTextColorChange={(value) =>
          setLogoGrid((prev) => ({ ...prev, title_text_color: value }))
        }
        onRemoveItem={handleRemoveLogoItem}
        onSave={handleSaveLogoGrid}
      />

      <HomeStoriesEditor
        items={storiesItems}
        loading={storiesLoading}
        saving={storiesSaving}
        error={storiesError}
        onAddMedia={() => {
          setLibraryContext({ type: 'stories', index: '', device: 'desktop' })
          setShowLibrary(true)
        }}
        onReplaceMedia={(storyId) => {
          setLibraryContext({ type: 'stories', index: storyId, device: 'desktop' })
          setShowLibrary(true)
        }}
        onRemove={handleRemoveStoryItem}
        onChange={handleStoryItemChange}
        onSave={handleSaveStories}
        onClear={() => setStoriesItems([])}
      />

      <HomeBrowseCardsEditor
        cards={browseCards}
        activeSegment={activeBrowseSegment}
        loading={browseCardsLoading}
        saving={browseCardsSaving}
        error={browseCardsError}
        onSegmentChange={setActiveBrowseSegment}
        onAddImages={(segment) => {
          setLibraryContext({ type: `browse-${segment}`, index: '', device: 'desktop' })
          setShowLibrary(true)
        }}
        onReplaceImage={(segment, cardId) => {
          setLibraryContext({ type: `browse-${segment}`, index: cardId, device: 'desktop' })
          setShowLibrary(true)
        }}
        onRemoveCard={handleRemoveBrowseCard}
        onChangeCard={handleBrowseCardChange}
        onSave={handleSaveBrowseCards}
        onClear={handleClearBrowseSegment}
      />

      <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-slate-800'>Home product catalog</p>
            <p className='text-xs text-slate-500'>
              Configure title, description, filter, and number of products for the home catalog.
            </p>
          </div>
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          <label className='block'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Browse section title
            </span>
            <input
              value={form.browse_categories_title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, browse_categories_title: event.target.value }))
              }
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
              placeholder="People's Favorite"
            />
          </label>

          <label className='block'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Catalog title
            </span>
            <input
              value={form.home_catalog_title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, home_catalog_title: event.target.value }))
              }
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
              placeholder='Fashion Collection'
            />
          </label>

          <label className='block lg:col-span-2'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Catalog description
            </span>
            <textarea
              value={form.home_catalog_description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, home_catalog_description: event.target.value }))
              }
              rows={3}
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
              placeholder='Discover our latest trends and bestsellers'
            />
          </label>

          <div>
            <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Filter mode
            </label>
            <CustomSelect
              value={form.home_catalog_filter_mode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, home_catalog_filter_mode: event.target.value }))
              }
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
            >
              <option value='none'>None</option>
              <option value='category'>Category</option>
              <option value='tag'>Tag</option>
            </CustomSelect>
          </div>

          <div>
            <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Product limit
            </label>
            <input
              type='number'
              min={1}
              max={30}
              value={form.home_catalog_limit}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  home_catalog_limit: Math.max(1, Math.min(30, Number(event.target.value) || 12)),
                }))
              }
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700'
            />
          </div>

          <div>
            <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Category
            </label>
            <CustomSelect
              value={form.home_catalog_category_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, home_catalog_category_id: event.target.value }))
              }
              disabled={form.home_catalog_filter_mode !== 'category'}
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50'
            >
              <option value=''>
                {childrenLoading ? 'Loading categories...' : 'Select category'}
              </option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label className='text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Tag
            </label>
            <CustomSelect
              value={form.home_catalog_tag_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, home_catalog_tag_id: event.target.value }))
              }
              disabled={form.home_catalog_filter_mode !== 'tag'}
              className='mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50'
            >
              <option value=''>{tagsLoading ? 'Loading tags...' : 'Select tag'}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </CustomSelect>
          </div>
        </div>

        <div className='mt-4 flex items-center gap-3'>
          <button
            type='button'
            onClick={handleSaveHome}
            disabled={savingHome}
            className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
          >
            {savingHome ? 'Saving...' : 'Save product catalog'}
          </button>
        </div>
      </section>

      <ProductImageLibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onApply={handleLibraryApply}
        title={libraryContext.type === 'stories' ? 'Story media library' : 'Homepage media library'}
        listEndpoint='/api/admin/component-media'
        uploadEndpoint='/api/admin/component-media/upload'
        deleteEndpointBase='/api/admin/component-media'
        videoListEndpoint={
          libraryContext.type === 'stories'
            ? '/api/admin/home/story-videos'
            : '/api/admin/media/video'
        }
        videoUploadEndpoint='/api/admin/media/video/upload'
        videoDeleteEndpointBase='/api/admin/media/video'
        selectedImages={selectedLibraryImages}
        selectedVideoId={selectedLibraryVideo.id}
        selectedVideoUrl={selectedLibraryVideo.url}
        enableVideoTab={libraryContext.type === 'stories'}
        allowUpload={libraryContext.type !== 'stories'}
        allowVideoUpload={false}
        allowMultiVideoSelection={
          libraryContext.type === 'stories' && !String(libraryContext.index || '').trim()
        }
        maxSelection={
          libraryContext.type === 'stories' && !String(libraryContext.index || '').trim()
            ? Math.max(1, 24 - storiesItems.length)
            : libraryContext.type === 'logo-grid'
            ? 24
            : String(libraryContext.type || '').startsWith('browse-')
              ? 12
              : 1
        }
      />

      <ProductPickerModal
        isOpen={showHotspotPicker}
        onClose={handleHotspotPickerClose}
        onSelect={handleHotspotProductSelect}
      />
    </div>
  )
}
