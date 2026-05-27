'use client'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const locationSchema = z.object({
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  postal: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
})

const providers = [
  {
    name: 'ipapi',
    url: 'https://ipapi.co/json/',
    map: (data) => ({
      city: data.city ?? null,
      region: data.region ?? null,
      postal: data.postal ?? null,
      country: data.country_name ?? data.country ?? null,
    }),
  },
  {
    name: 'ipinfo',
    url: 'https://ipinfo.io/json',
    map: (data) => ({
      city: data.city ?? null,
      region: data.region ?? null,
      postal: data.postal ?? null,
      country: data.country ?? null,
    }),
  },
]

const formatLocation = ({ city, region, postal, country }) => {
  const trimmedCity = city?.trim() || ''
  const trimmedRegion = region?.trim() || ''
  const trimmedPostal = postal?.trim() || ''
  const trimmedCountry = country?.trim() || ''

  const primaryParts = [trimmedCity, trimmedPostal].filter(Boolean)
  const primary = primaryParts.join(', ')
  if (primary && trimmedCountry) {
    return `${primary} • ${trimmedCountry}`
  }
  if (primary) {
    return primary
  }
  if (trimmedCountry) {
    return trimmedCountry
  }
  return trimmedRegion || ''
}

let cachedLocation = ''
let cachedPromise = null

const resolveLocation = async () => {
  if (cachedLocation) return cachedLocation
  if (cachedPromise) return cachedPromise

  cachedPromise = (async () => {
    for (const provider of providers) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const response = await fetch(provider.url, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          continue
        }

        const payload = await response.json()
        const normalized = provider.map(payload || {})
        const parsed = locationSchema.safeParse(normalized)
        if (!parsed.success) {
          continue
        }

        const formatted = formatLocation(parsed.data)
        if (formatted) {
          cachedLocation = formatted
          return cachedLocation
        }
      } catch {
        continue
      }
    }

    return ''
  })()

  return cachedPromise
}

export function useIpLocation() {
  const [locationLabel, setLocationLabel] = useState(cachedLocation || '')

  useEffect(() => {
    let isMounted = true

    if (cachedLocation) {
      return () => {
        isMounted = false
      }
    }

    resolveLocation()
      .then((location) => {
        if (!isMounted) return
        if (location) {
          setLocationLabel(location)
        }
      })
      .catch(() => {
        if (!isMounted) return
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { locationLabel }
}
