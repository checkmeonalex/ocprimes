const activatedImageSources = new Set()
const readyImageSources = new Set()

const normalizeImageSource = (src) => String(src || '').trim()

export const hasActivatedImageSource = (src) => activatedImageSources.has(normalizeImageSource(src))

export const markImageSourceActivated = (src) => {
  const normalized = normalizeImageSource(src)
  if (!normalized) return
  activatedImageSources.add(normalized)
}

export const hasReadyImageSource = (src) => readyImageSources.has(normalizeImageSource(src))

export const markImageSourceReady = (src) => {
  const normalized = normalizeImageSource(src)
  if (!normalized) return
  readyImageSources.add(normalized)
  activatedImageSources.add(normalized)
}
