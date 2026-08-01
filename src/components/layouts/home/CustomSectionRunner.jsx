'use client'

import { memo, useEffect, useRef, useState } from 'react'

const MOBILE_BREAKPOINT_PX = 768

const runScopedScript = (section, code, label) => {
  const trimmed = String(code || '').trim()
  if (!trimmed || !section) return undefined

  let cancelled = false
  const run = () => {
    if (cancelled) return
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('section', trimmed)
      fn(section)
    } catch (error) {
      console.error(`Custom HTML section script failed (${label}):`, error)
    }
  }

  // Defer until after the browser has painted so custom scripts never
  // delay first render.
  const id = window.requestIdleCallback
    ? window.requestIdleCallback(run, { timeout: 1500 })
    : window.setTimeout(run, 0)

  return () => {
    cancelled = true
    if (window.requestIdleCallback) window.cancelIdleCallback(id)
    else window.clearTimeout(id)
  }
}

/**
 * Renders admin-authored HTML for a "Custom HTML" section and, once mounted,
 * runs its paired JS scoped to that section's own DOM node (passed in as
 * `section`).
 *
 * Wrapped in React.memo: `dangerouslySetInnerHTML` is reapplied by React on
 * every re-render of its owning element — not just when the HTML string
 * changes — which tears down and rebuilds the section's entire DOM subtree
 * each time, killing anything the script built (e.g. a running countdown)
 * and detaching any listeners/observers it registered. On a page whose
 * parent re-renders for unrelated reasons (context updates, sibling state),
 * that happens repeatedly forever, so the script would never appear to run
 * at all. Memoizing on the actual content props means React skips
 * re-rendering (and therefore re-applying dangerouslySetInnerHTML) unless
 * this section's own html/js actually changed.
 *
 * When a mobile variant is enabled, only one variant's markup is ever
 * mounted into the DOM and only that variant's JS ever executes — the other
 * is not rendered, not attached, and its script never runs. The viewport
 * check happens client-side after mount (there's no flash of the wrong
 * variant's *behavior* since JS only starts once the correct one is chosen;
 * the brief blank instant before that is the trade-off for not needing
 * server-side device detection).
 */
function CustomSectionRunner({ html, js, mobileEnabled = false, mobileHtml = '', mobileJs = '' }) {
  const sectionRef = useRef(null)
  const [variant, setVariant] = useState(mobileEnabled ? null : 'desktop')

  useEffect(() => {
    if (!mobileEnabled) {
      setVariant('desktop')
      return undefined
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
    const apply = () => setVariant(mql.matches ? 'mobile' : 'desktop')
    apply()

    mql.addEventListener ? mql.addEventListener('change', apply) : mql.addListener(apply)
    return () => {
      mql.removeEventListener ? mql.removeEventListener('change', apply) : mql.removeListener(apply)
    }
  }, [mobileEnabled])

  const activeHtml = variant === 'mobile' ? mobileHtml : html
  const activeJs = variant === 'mobile' ? mobileJs : js

  useEffect(() => {
    if (!variant) return undefined
    return runScopedScript(sectionRef.current, activeJs, variant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, activeJs])

  if (!variant) return null

  // eslint-disable-next-line react/no-danger
  return <div ref={sectionRef} dangerouslySetInnerHTML={{ __html: activeHtml }} />
}

export default memo(CustomSectionRunner)
