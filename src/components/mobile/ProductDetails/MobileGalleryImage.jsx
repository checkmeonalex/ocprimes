'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import ProductImagePlaceholder from '../../product/ProductDetails/ProductImagePlaceholder'
import {
  hasActivatedImageSource,
  hasReadyImageSource,
  markImageSourceActivated,
  markImageSourceReady,
} from '../../product/imageLoadState.mjs'

export default function MobileGalleryImage({ src, alt, isActive }) {
  const normalizedSrc = String(src || '').trim()
  const timeoutRef = useRef(null)
  const hostRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(() => {
    if (!normalizedSrc) return false
    return isActive || hasActivatedImageSource(normalizedSrc)
  })
  const [isReady, setIsReady] = useState(() => {
    if (!normalizedSrc) return false
    return hasReadyImageSource(normalizedSrc)
  })

  useEffect(() => {
    if (!normalizedSrc) {
      setShouldLoad(false)
      setIsReady(false)
      return
    }

    const activated = isActive || hasActivatedImageSource(normalizedSrc)
    const ready = hasReadyImageSource(normalizedSrc)
    setShouldLoad(activated)
    setIsReady(ready)
  }, [isActive, normalizedSrc])

  useEffect(() => {
    if (!normalizedSrc || !isActive || shouldLoad) return
    markImageSourceActivated(normalizedSrc)
    setShouldLoad(true)
  }, [isActive, normalizedSrc, shouldLoad])

  useEffect(() => {
    if (!shouldLoad || !normalizedSrc || isReady) return undefined

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsReady(true)
    }, 3000)

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isReady, normalizedSrc, shouldLoad])

  useEffect(() => {
    if (!shouldLoad || !normalizedSrc || isReady) return

    const nestedImage = hostRef.current?.querySelector('img')
    if (!nestedImage) return
    if (!nestedImage.complete || Number(nestedImage.naturalWidth || 0) <= 0) return

    markImageSourceReady(normalizedSrc)
    setIsReady(true)
  }, [isReady, normalizedSrc, shouldLoad])

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const markReady = () => {
    if (!normalizedSrc) {
      setIsReady(true)
      return
    }

    markImageSourceReady(normalizedSrc)
    setIsReady(true)
  }

  return (
    <div ref={hostRef} className='relative h-full w-full overflow-hidden'>
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isReady ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <ProductImagePlaceholder className='absolute inset-0' />
      </div>

      {shouldLoad ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          fill
          priority={isActive}
          sizes='100vw'
          className={`object-cover transition-opacity duration-300 ${
            isReady ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={markReady}
          onError={markReady}
          unoptimized
        />
      ) : null}
    </div>
  )
}
