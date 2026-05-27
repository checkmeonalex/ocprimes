import { aboutPages } from './aboutPages.mjs'
import { legalPages } from './legalPages.mjs'

const groupedPages = {
  about: aboutPages,
  legal: legalPages,
}

export function getTrustPages(group) {
  return groupedPages[group] || []
}

export function getTrustPage(group, slug) {
  return getTrustPages(group).find((page) => page.slug === slug) || null
}

export function getTrustPageParams(group) {
  return getTrustPages(group).map((page) => ({ slug: page.slug }))
}
