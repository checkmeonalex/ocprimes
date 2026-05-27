'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  MessageCircleMore,
  RotateCcw,
  Search,
  Settings2,
  Truck,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import HelpCenterQuickAccess from './HelpCenterQuickAccess'
import HelpCenterSections from './HelpCenterSections'
import HelpCenterSidebar from './HelpCenterSidebar'
import {
  HELP_CENTER_POPULAR_SEARCHES,
  HELP_CENTER_SECTIONS,
  HELP_CENTER_SUPPORT_ACTIONS,
} from './helpCenterData.mjs'

const supportIconMap = {
  clipboard: ClipboardList,
  'credit-card': CreditCard,
  rotate: RotateCcw,
  settings: Settings2,
  truck: Truck,
}

const PRIORITY_SECTION_IDS = [
  'orders-delivery',
  'payments-checkout',
  'returns-refunds',
  'account-security',
  'products-sellers',
  'app-technical-issues',
]

function SupportAction({ action }) {
  const Icon = supportIconMap[action.icon] || ClipboardList

  return (
    <Link
      href={action.href}
      className='group flex flex-col items-center gap-3 text-center transition hover:-translate-y-0.5'
    >
      <div className='flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_12px_25px_rgba(56,84,122,0.08)]'>
        <Icon className='h-8 w-8 text-[#17564d]' strokeWidth={1.8} aria-hidden='true' />
      </div>
      <p className='max-w-[120px] text-sm font-medium leading-5 text-[#17352b] transition group-hover:text-[#0d2c23]'>
        {action.label}
      </p>
    </Link>
  )
}

export default function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const resultsRef = useRef(null)
  const router = useRouter()
  const normalizedQuery = query.trim().toLowerCase()
  const orderedSections = [
    ...HELP_CENTER_SECTIONS.filter((section) => PRIORITY_SECTION_IDS.includes(section.id)),
    ...HELP_CENTER_SECTIONS.filter((section) => !PRIORITY_SECTION_IDS.includes(section.id)),
  ]
  const suggestionMatches = normalizedQuery
    ? orderedSections
        .flatMap((section) =>
          section.articles.map((article) => ({
            id: `${section.id}-${article.id}`,
            href: `/help-center/${section.id}/${article.id}`,
            title: article.title,
            description: article.description,
            sectionTitle: section.title,
            score: [
              article.title.toLowerCase().startsWith(normalizedQuery) ? 4 : 0,
              article.title.toLowerCase().includes(normalizedQuery) ? 3 : 0,
              section.title.toLowerCase().includes(normalizedQuery) ? 2 : 0,
              article.description.toLowerCase().includes(normalizedQuery) ? 1 : 0,
            ].reduce((total, value) => total + value, 0),
          })),
        )
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, 5)
    : []
  const showSuggestions = isSearchFocused && normalizedQuery.length > 0

  const sections = orderedSections.map((section) => {
    if (!normalizedQuery) return section

    const sectionMatches =
      section.title.toLowerCase().includes(normalizedQuery) ||
      section.summary.toLowerCase().includes(normalizedQuery)

    const filteredArticles = section.articles.filter(
      (article) =>
        article.title.toLowerCase().includes(normalizedQuery) ||
        article.description.toLowerCase().includes(normalizedQuery),
    )

    if (!sectionMatches && !filteredArticles.length) return null

    return {
      ...section,
      articles: filteredArticles.length ? filteredArticles : section.articles,
    }
  }).filter(Boolean)

  const handleSearchAction = () => {
    setIsSearchFocused(false)

    if (resultsRef.current) {
      const offsetTop = resultsRef.current.getBoundingClientRect().top + window.scrollY - 112
      window.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: 'smooth',
      })
    }
  }

  const handleSuggestionSelect = (href) => {
    setIsSearchFocused(false)
    router.push(href)
  }

  return (
    <div className='min-h-screen bg-[rgb(253_253_253)]'>
      <div className='mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
        <div className='mb-5 flex items-center gap-2 text-sm text-[#6d7367]'>
          <Link href='/' className='transition hover:text-[#17352b]'>
            Home
          </Link>
          <span>/</span>
          <span className='font-medium text-[#17352b]'>Help Center</span>
        </div>

        <div className='grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]'>
          <HelpCenterSidebar sections={sections.filter((section) => PRIORITY_SECTION_IDS.includes(section.id))} />

          <main>
            <section className='overflow-visible rounded-[30px] border border-[#d7e4f0] bg-[#dfe9f2] px-5 py-7 shadow-[0_28px_65px_rgba(56,84,122,0.08)] sm:px-8 sm:py-9'>
              <p className='text-center text-sm font-medium text-[#5c6a68]'>Help Center</p>
              <h1 className='mt-3 text-center text-4xl font-semibold tracking-tight text-[#17352b] sm:text-5xl'>
                How can we help?
              </h1>
              <p className='mt-4 text-center text-base text-[#41524e]'>
                Choose a help topic or{' '}
                <Link
                  href='/account/messages?help_center=1'
                  className='font-semibold underline underline-offset-4'
                >
                  chat with us
                </Link>
                .
              </p>

              <div className='relative z-20 mx-auto mt-6 max-w-4xl'>
                <div className='relative'>
                  <label className='flex items-center gap-3 rounded-full border border-[#d0ddec] bg-white px-4 py-3 shadow-[0_10px_25px_rgba(56,84,122,0.06)]'>
                    <Search className='h-5 w-5 text-[#5c6a68]' aria-hidden='true' />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && normalizedQuery) {
                          event.preventDefault()
                          handleSearchAction()
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setIsSearchFocused(false)
                        }, 120)
                      }}
                      placeholder='Search help center'
                      className='w-full bg-transparent text-sm text-[#17352b] outline-none placeholder:text-[#7b857e]'
                      type='search'
                    />
                    {query ? (
                      <button
                        type='button'
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setQuery('')}
                        className='inline-flex h-7 w-7 items-center justify-center rounded-full text-[#5c6a68] transition hover:bg-[#eef5ff] hover:text-[#17352b]'
                        aria-label='Clear search'
                      >
                        <X className='h-4 w-4' aria-hidden='true' />
                      </button>
                    ) : null}
                  </label>

                  {showSuggestions ? (
                    <div className='absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-[24px] border border-[#d7e4f0] bg-white shadow-[0_22px_50px_rgba(56,84,122,0.14)]'>
                      <button
                        type='button'
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleSearchAction}
                        className='flex w-full items-center justify-between gap-3 border-b border-[#e5edf6] px-5 py-4 text-left transition hover:bg-[#f6faff]'
                      >
                        <div>
                          <p className='text-sm text-[#5f6658]'>Search for</p>
                          <p className='mt-1 text-base font-semibold text-[#17352b]'>
                            &quot;{query.trim()}&quot;
                          </p>
                        </div>
                        <ArrowUpRight className='h-4 w-4 shrink-0 text-[#5c6a68]' aria-hidden='true' />
                      </button>

                      {suggestionMatches.length ? (
                        <div className='py-2'>
                          {suggestionMatches.map((item) => (
                            <button
                              key={item.id}
                              type='button'
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSuggestionSelect(item.href)}
                              className='block w-full px-5 py-3 text-left transition hover:bg-[#f6faff]'
                            >
                              <div className='flex items-start justify-between gap-3'>
                                <div>
                                  <p className='text-sm font-semibold text-[#17352b]'>
                                    {item.title}
                                  </p>
                                  <p className='mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7e90]'>
                                    {item.sectionTitle}
                                  </p>
                                </div>
                                <ArrowUpRight
                                  className='mt-0.5 h-4 w-4 shrink-0 text-[#6f7e90]'
                                  aria-hidden='true'
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className='px-5 py-4 text-sm text-[#5f6658]'>
                          No direct article suggestion yet. Press search to filter the Help Center.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
                  {HELP_CENTER_POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type='button'
                      onClick={() => {
                        setQuery(term)
                        setIsSearchFocused(true)
                      }}
                      className='rounded-full border border-[#d7e4f0] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f6658] transition hover:border-[#bfd4ea] hover:text-[#17352b]'
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className='mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4'>
                {HELP_CENTER_SUPPORT_ACTIONS.map((action) => (
                  <SupportAction key={action.id} action={action} />
                ))}
              </div>
            </section>

            <HelpCenterQuickAccess />
            <div ref={resultsRef}>
              <HelpCenterSections sections={sections} query={query} />
            </div>

            <section className='mt-10 rounded-[28px] border border-[#d8d2c4] bg-[#17352b] px-6 py-7 text-white shadow-[0_30px_65px_rgba(17,38,32,0.16)] sm:px-8'>
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
    </div>
  )
}
