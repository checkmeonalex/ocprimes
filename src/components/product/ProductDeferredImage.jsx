'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProductImagePlaceholder from './ProductDetails/ProductImagePlaceholder'
import {
  hasReadyImageSource,
  markImageSourceActivated,
  markImageSourceReady,
} from './imageLoadState.mjs'

const assignRef = (ref, value) => {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(value)
    return
  }
  ref.current = value
}

export default function ProductDeferredImage({
  src,
  alt,
  imgClassName = '',
  placeholderClassName = '',
  imgStyle,
  eager = false,
  isLoadEnabled = true,
  decoding = 'async',
  draggable = false,
  fetchPriority,
  sizes,
  onLoad,
  onReady,
  onError,
  imgRef = null,
}) {
  const normalizedSrc = useMemo(() => String(src || '').trim(), [src])
  const imageRef = useRef(null)
  const fallbackTimeoutRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(() => {
    if (!normalizedSrc) return false
    return true
  })
  const [isReady, setIsReady] = useState(() => {
    if (!normalizedSrc) return false
    return hasReadyImageSource(normalizedSrc)
  })
  const [showPlaceholder, setShowPlaceholder] = useState(() => !hasReadyImageSource(normalizedSrc))

  const handleReady = useCallback(
    (imageElement) => {
      if (!normalizedSrc) return
      markImageSourceReady(normalizedSrc)
      setIsReady(true)
      onReady?.(imageElement)
    },
    [normalizedSrc, onReady],
  )

  const finalizeImageReady = useCallback(
    (imageElement) => {
      if (!imageElement) return
      handleReady(imageElement)
    },
    [handleReady],
  )

  useEffect(() => {
    if (!normalizedSrc) {
      setShouldLoad(false)
      setIsReady(false)
      setShowPlaceholder(true)
      return
    }

    const ready = hasReadyImageSource(normalizedSrc)
    markImageSourceActivated(normalizedSrc)
    setShouldLoad(true)
    setIsReady(ready)
    setShowPlaceholder(!ready)
  }, [normalizedSrc])

  useEffect(() => {
    if (!normalizedSrc || !isLoadEnabled) return undefined
    markImageSourceActivated(normalizedSrc)
    setShouldLoad(true)
    return undefined
  }, [isLoadEnabled, normalizedSrc])

  useEffect(() => {
    if (eager && normalizedSrc && !shouldLoad) {
      markImageSourceActivated(normalizedSrc)
      setShouldLoad(true)
    }
  }, [eager, normalizedSrc, shouldLoad])

  useEffect(() => {
    if (!shouldLoad || !normalizedSrc || isReady) return
    const imageElement = imageRef.current
    if (!imageElement) return
    if (!imageElement.complete || Number(imageElement.naturalWidth || 0) <= 0) return
    finalizeImageReady(imageElement)
  }, [finalizeImageReady, isReady, normalizedSrc, shouldLoad])

  useEffect(() => {
    if (!showPlaceholder) return undefined
    if (!isReady) return undefined
    const timeoutId = window.setTimeout(() => setShowPlaceholder(false), 220)
    return () => window.clearTimeout(timeoutId)
  }, [isReady, showPlaceholder])

  useEffect(() => {
    if (fallbackTimeoutRef.current) {
      window.clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }

    if (!shouldLoad || !showPlaceholder || isReady) return undefined

    fallbackTimeoutRef.current = window.setTimeout(() => {
      setIsReady(true)
      setShowPlaceholder(false)
    }, 3000)

    return () => {
      if (fallbackTimeoutRef.current) {
        window.clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
  }, [isReady, shouldLoad, showPlaceholder])

  useEffect(() => () => {
    if (fallbackTimeoutRef.current) {
      window.clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }
  }, [])

  const handleImageLoad = useCallback(
    (event) => {
      onLoad?.(event)
      finalizeImageReady(event.currentTarget)
    },
    [finalizeImageReady, onLoad],
  )

  const handleImageError = useCallback(
    (event) => {
      setIsReady(true)
      setShowPlaceholder(false)
      onError?.(event)
    },
    [onError],
  )

  const setImageNode = useCallback(
    (node) => {
      imageRef.current = node
      assignRef(imgRef, node)
    },
    [imgRef],
  )

  if (!normalizedSrc) {
    return <ProductImagePlaceholder className={placeholderClassName} />
  }

  return (
    <>
      {showPlaceholder ? (
        <ProductImagePlaceholder
          className={`pointer-events-none transition-opacity duration-300 ${isReady ? 'opacity-0' : 'opacity-100'} ${placeholderClassName}`.trim()}
        />
      ) : null}

      {shouldLoad ? (
        <img
          ref={setImageNode}
          src={normalizedSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'} ${imgClassName}`.trim()}
          style={imgStyle}
          decoding={decoding}
          draggable={draggable}
          fetchPriority={fetchPriority}
          sizes={sizes}
          loading='eager'
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : null}
    </>
  )
}
