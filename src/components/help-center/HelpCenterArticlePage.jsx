'use client'

import Link from 'next/link'
import {
  ChevronLeft,
  ClipboardList,
  CreditCard,
  MessageCircleMore,
  Rocket,
  Search,
  Settings2,
  Smartphone,
  Stars,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const iconMap = {
  rocket: Rocket,
  'credit-card': CreditCard,
  settings: Settings2,
  smartphone: Smartphone,
  clipboard: ClipboardList,
  stars: Stars,
}

const inlineTokenPattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|==([^=]+)==/g

function countListItems(items = []) {
  return items.reduce((count, item) => {
    const normalizedItem = typeof item === 'string' ? { text: item } : item
    return count + 1 + countListItems(normalizedItem.children)
  }, 0)
}

function renderInlineContent(value, keyPrefix) {
  if (!value) return null

  const nodes = []
  let lastIndex = 0
  let match

  inlineTokenPattern.lastIndex = 0

  while ((match = inlineTokenPattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-text-${lastIndex}`}>{value.slice(lastIndex, match.index)}</span>,
      )
    }

    if (match[1] && match[2]) {
      const href = match[2]
      const label = match[1]
      const linkClassName =
        'font-medium text-[#1b5be0] underline decoration-[#1b5be0]/45 underline-offset-[3px] transition hover:text-[#143f99]'

      nodes.push(
        href.startsWith('/') ? (
          <Link key={`${keyPrefix}-link-${match.index}`} href={href} className={linkClassName}>
            {label}
          </Link>
        ) : (
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={href}
            className={linkClassName}
            target='_blank'
            rel='noreferrer'
          >
            {label}
          </a>
        ),
      )
    } else if (match[3]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${match.index}`} className='font-semibold text-[#17352b]'>
          {match[3]}
        </strong>,
      )
    } else if (match[4]) {
      nodes.push(
        <mark
          key={`${keyPrefix}-mark-${match.index}`}
          className='rounded bg-[#f5e6a9] px-1 py-0.5 font-medium text-[#17352b]'
        >
          {match[4]}
        </mark>,
      )
    }

    lastIndex = inlineTokenPattern.lastIndex
  }

  if (lastIndex < value.length) {
    nodes.push(<span key={`${keyPrefix}-text-end`}>{value.slice(lastIndex)}</span>)
  }

  return nodes.length ? nodes : value
}

function renderBulletItems(items = [], depth = 0, keyPrefix = 'bullet') {
  if (!items.length) return null

  return (
    <ul
      className={
        depth === 0
          ? 'list-disc space-y-3 pl-6'
          : 'mt-3 list-[circle] space-y-2 pl-6 text-[16px] leading-7 text-[#4f5a52]'
      }
    >
      {items.map((item, index) => {
        const normalizedItem = typeof item === 'string' ? { text: item } : item

        return (
          <li key={`${keyPrefix}-${depth}-${index}`} className='pl-1'>
            <span>{renderInlineContent(normalizedItem.text, `${keyPrefix}-${depth}-${index}`)}</span>
            {normalizedItem.children?.length
              ? renderBulletItems(
                  normalizedItem.children,
                  depth + 1,
                  `${keyPrefix}-${depth}-${index}-children`,
                )
              : null}
          </li>
        )
      })}
    </ul>
  )
}

function renderStepItems(items = [], depth = 0, keyPrefix = 'step') {
  if (!items.length) return null

  return (
    <ol
      className={
        depth === 0
          ? 'list-decimal space-y-3 pl-6'
          : 'mt-3 list-[lower-alpha] space-y-2 pl-6 text-[16px] leading-7 text-[#4f5a52]'
      }
    >
      {items.map((item, index) => {
        const normalizedItem = typeof item === 'string' ? { text: item } : item

        return (
          <li key={`${keyPrefix}-${depth}-${index}`} className='pl-1'>
            <span>{renderInlineContent(normalizedItem.text, `${keyPrefix}-${depth}-${index}`)}</span>
            {normalizedItem.children?.length
              ? renderStepItems(
                  normalizedItem.children,
                  depth + 1,
                  `${keyPrefix}-${depth}-${index}-children`,
                )
              : null}
          </li>
        )
      })}
    </ol>
  )
}

export default function HelpCenterArticlePage({ section, article, allSections }) {
  const [query, setQuery] = useState('')
  const [sidebarHeight, setSidebarHeight] = useState(null)
  const sidebarScrollRef = useRef(null)
  const normalizedQuery = query.trim().toLowerCase()
  const Icon = iconMap[section.icon] || Rocket
  const paragraphCount = article.content.reduce(
    (count, block) =>
      count +
      (block.paragraphs?.length || 0) +
      countListItems(block.bullets) +
      countListItems(block.steps),
    0,
  )
  const estimatedReadTime = Math.max(2, Math.ceil(paragraphCount * 0.75))

  const visibleSections = allSections
    .map((entry) => {
      if (!normalizedQuery) return entry

      const sectionMatches =
        entry.title.toLowerCase().includes(normalizedQuery) ||
        entry.summary.toLowerCase().includes(normalizedQuery)

      const filteredArticles = entry.articles.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery),
      )

      if (!sectionMatches && !filteredArticles.length) return null

      return {
        ...entry,
        articles: filteredArticles.length ? filteredArticles : entry.articles,
      }
    })
    .filter(Boolean)

  useEffect(() => {
    const sidebarElement = sidebarScrollRef.current
    if (!sidebarElement) return undefined

    let frameId = null

    const updateSidebarHeight = () => {
      if (window.innerWidth < 1280) {
        setSidebarHeight(null)
        return
      }

      const rect = sidebarElement.getBoundingClientRect()
      const availableHeight = Math.max(280, Math.floor(window.innerHeight - rect.top - 24))

      setSidebarHeight((currentHeight) =>
        currentHeight === availableHeight ? currentHeight : availableHeight,
      )
    }

    const scheduleUpdate = () => {
      if (frameId !== null) return

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateSidebarHeight()
      })
    }

    updateSidebarHeight()
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })

    return () => {
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate)

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [query, article.id, section.id])

  return (
    <div className='min-h-screen bg-[#f4f8ff]'>
      <div className='mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
        <div className='mb-5 flex flex-wrap items-center gap-2 text-sm text-[#6d7367]'>
          <Link href='/' className='transition hover:text-[#17352b]'>
            Home
          </Link>
          <span>/</span>
          <Link href='/help' className='transition hover:text-[#17352b]'>
            Help Center
          </Link>
          <span>/</span>
          <span className='font-medium text-[#17352b]'>{article.title}</span>
        </div>

        <div className='grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]'>
          <aside className='order-2 xl:order-none xl:sticky xl:top-24 xl:self-start'>
            <div>
              <div className='border-b border-[#d7e4f0] pb-5'>
                <h2 className='text-2xl font-semibold tracking-tight text-[#17352b]'>
                  Need more help?
                </h2>
                <p className='mt-2 text-sm leading-6 text-[#5f6658]'>
                  Search help topics or jump directly to a related article.
                </p>
                <label className='mt-4 flex items-center gap-3 rounded-full border border-[#d0ddec] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(65,97,136,0.05)]'>
                  <Search className='h-4 w-4 text-[#5f6658]' aria-hidden='true' />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='Search help topics'
                    className='w-full bg-transparent text-sm text-[#17352b] outline-none placeholder:text-[#7c8579]'
                    type='search'
                  />
                </label>
              </div>

              <div
                ref={sidebarScrollRef}
                className='help-center-sidebar-scrollbar pt-5 xl:overflow-y-auto xl:overscroll-contain xl:pr-2 xl:pb-6'
                style={sidebarHeight ? { maxHeight: `${sidebarHeight}px` } : undefined}
              >
                <div className='space-y-4'>
                  {visibleSections.map((entry) => {
                    const EntryIcon = iconMap[entry.icon] || Rocket

                    return (
                      <div key={entry.id} className='overflow-hidden rounded-[22px] border border-[#dbe5f0] bg-[#f8fbff] shadow-[0_12px_32px_rgba(66,98,139,0.05)]'>
                        <div className='flex items-center gap-3 border-b border-[#dbe5f0] px-4 py-4'>
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full ${entry.accentClassName}`}
                          >
                            <EntryIcon className='h-5 w-5' strokeWidth={1.9} aria-hidden='true' />
                          </div>
                          <div>
                            <p className='text-base font-semibold text-[#17352b]'>{entry.title}</p>
                            <p className='text-xs uppercase tracking-[0.16em] text-[#7c786b]'>
                              {entry.articles.length} topics
                            </p>
                          </div>
                        </div>

                        <div className='p-3'>
                          {entry.articles.map((item) => {
                            const isActive = section.id === entry.id && article.id === item.id

                            return (
                              <Link
                                key={item.id}
                                href={`/help/${entry.id}/${item.id}`}
                                className={`block rounded-2xl px-4 py-3 text-sm leading-6 transition ${
                                  isActive
                                    ? 'bg-[#1b5be0] font-semibold text-white'
                                    : 'text-[#455148] hover:bg-[#eef5ff] hover:text-[#17352b]'
                                }`}
                              >
                                {item.title}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className='order-1 xl:order-none'>
            <Link
              href='/help'
              className='inline-flex items-center gap-2 text-sm font-medium text-[#5f6658] transition hover:text-[#17352b]'
            >
              <ChevronLeft className='h-4 w-4' aria-hidden='true' />
              Back to Help Center
            </Link>

            <section className='mt-4 overflow-hidden rounded-[28px] border border-[#d8d2c4] bg-[#dfe9f2] shadow-[0_24px_55px_rgba(24,36,32,0.05)]'>
              <div className='relative overflow-hidden rounded-[24px] bg-[#d7e4f0] px-4 py-5 sm:px-6 sm:py-5'>
                <div className='pointer-events-none absolute right-0 top-0 flex h-full items-stretch'>
                  <div className='w-12 rounded-l-full bg-white/14' />
                  <div className='w-12 rounded-l-full bg-white/10' />
                  <div className='w-12 rounded-l-full bg-white/8' />
                </div>
                <div className='relative flex flex-col gap-3 sm:flex-row sm:items-center'>
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full shadow-[0_10px_24px_rgba(18,40,32,0.08)] ${section.accentClassName}`}
                  >
                    <Icon className='h-7 w-7' strokeWidth={1.9} aria-hidden='true' />
                  </div>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7570]'>
                      {section.title}
                    </p>
                    <h1 className='mt-1.5 text-[2rem] font-semibold tracking-tight text-[#17352b] sm:text-[2.45rem]'>
                      {article.title}
                    </h1>
                    <p className='mt-2 max-w-3xl text-[15px] leading-7 text-[#475852] sm:text-[17px]'>
                      {article.description}
                    </p>
                    <div className='mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6d68]'>
                      <span className='rounded-full border border-[#bcc8c0] bg-white/60 px-3 py-1.5'>
                        {estimatedReadTime} min read
                      </span>
                      <span className='rounded-full border border-[#bcc8c0] bg-white/60 px-3 py-1.5'>
                        {article.content.length} sections
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <article className='mt-8'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7e90]'>
                  In this article
                </p>
                <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                  {article.content.map((block, index) => (
                    <a
                      key={block.heading}
                      href={`#article-section-${index + 1}`}
                      className='rounded-2xl border border-[#d7e4f0] bg-white px-4 py-3 text-sm font-medium text-[#455148] shadow-[0_8px_24px_rgba(66,98,139,0.04)] transition hover:border-[#bfd4ea] hover:text-[#17352b]'
                    >
                      {block.heading}
                    </a>
                  ))}
                </div>
              </div>

              <div className='mt-8 space-y-12'>
                {article.content.map((block, index) => (
                  <section
                    key={block.heading}
                    id={`article-section-${index + 1}`}
                    className='max-w-3xl scroll-mt-28'
                  >
                    <h2 className='text-[clamp(1.7rem,3vw,2.2rem)] font-semibold tracking-tight text-[#17352b]'>
                      {block.heading}
                    </h2>
                    <div className='mt-5 space-y-5 text-[18px] leading-8 text-[#445148]'>
                      {block.paragraphs?.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${block.heading}-paragraph-${paragraphIndex}`}
                          className={index === 0 && paragraphIndex === 0 ? 'text-[#243a33]' : ''}
                        >
                          {renderInlineContent(
                            paragraph,
                            `${block.heading}-paragraph-${paragraphIndex}`,
                          )}
                        </p>
                      ))}
                      {renderStepItems(block.steps, 0, `${block.heading}-steps`)}
                      {renderBulletItems(block.bullets, 0, `${block.heading}-bullets`)}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <section className='mt-8 rounded-[28px] border border-[#d8d2c4] bg-[#17352b] px-6 py-7 text-white shadow-[0_30px_65px_rgba(17,38,32,0.16)] sm:px-8'>
              <div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#d9e2c6]'>
                    Didn&apos;t find what you&apos;re looking for?
                  </p>
                  <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                    Contact Support and we&apos;ll help you resolve the issue.
                  </h2>
                </div>

                <Link
                  href='/account/messages?help_center=1'
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(253_253_253)] px-5 py-3 text-sm font-semibold text-[#1b1b1b] transition hover:bg-white'
                >
                  <MessageCircleMore className='h-4 w-4' aria-hidden='true' />
                  Talk to Support
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
      <style jsx>{`
        .help-center-sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(23, 53, 43, 0.42) rgba(215, 208, 194, 0.32);
        }

        .help-center-sidebar-scrollbar::-webkit-scrollbar {
          width: 10px;
        }

        .help-center-sidebar-scrollbar::-webkit-scrollbar-track {
          background: rgba(215, 208, 194, 0.32);
          border-radius: 999px;
        }

        .help-center-sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(23, 53, 43, 0.7), rgba(15, 97, 85, 0.82));
          border-radius: 999px;
          border: 2px solid rgba(244, 241, 232, 0.95);
        }

        .help-center-sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(23, 53, 43, 0.82), rgba(15, 97, 85, 0.95));
        }
      `}</style>
    </div>
  )
}
