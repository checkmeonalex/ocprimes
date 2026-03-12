'use client'

import Link from 'next/link'
import { ChevronRight, ClipboardList, CreditCard, Rocket, Settings2, ShieldCheck, Smartphone, Stars } from 'lucide-react'

const iconMap = {
  rocket: Rocket,
  'credit-card': CreditCard,
  settings: Settings2,
  smartphone: Smartphone,
  clipboard: ClipboardList,
  stars: Stars,
}

function HelpArticleCard({ sectionId, article }) {
  return (
    <Link
      href={`/help-center/${sectionId}/${article.id}`}
      className='block rounded-[22px] border border-[#d7e4f0] bg-white p-5 shadow-[0_14px_35px_rgba(56,84,122,0.05)] transition hover:-translate-y-0.5 hover:border-[#bfd4ea] hover:shadow-[0_18px_40px_rgba(56,84,122,0.09)]'
    >
      <div className='flex items-start justify-between gap-3'>
        <h3 className='text-lg font-semibold tracking-tight text-[#17352b]'>
          {article.title}
        </h3>
        <ChevronRight className='mt-1 h-4 w-4 shrink-0 text-[#6f7e90]' aria-hidden='true' />
      </div>
      <p className='mt-3 text-sm leading-6 text-[#5f6658]'>{article.description}</p>
    </Link>
  )
}

export default function HelpCenterSections({ sections, query }) {
  return (
    <div className='mt-10 space-y-8'>
      {sections.map((section) => {
        const Icon = iconMap[section.icon] || Rocket

        return (
          <section
            key={section.id}
            id={section.id}
            className='scroll-mt-32 rounded-[30px] border border-[#d7e4f0] bg-[#edf5ff] p-5 shadow-[0_22px_55px_rgba(56,84,122,0.06)] sm:p-6'
          >
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-start gap-4'>
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${section.accentClassName}`}>
                  <Icon className='h-6 w-6' strokeWidth={1.9} aria-hidden='true' />
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7e90]'>
                    Help Category
                  </p>
                  <h2 className='mt-1 text-2xl font-semibold tracking-tight text-[#17352b]'>
                    {section.title}
                  </h2>
                  <p className='mt-2 max-w-3xl text-sm leading-6 text-[#5f6658]'>
                    {section.summary}
                  </p>
                </div>
              </div>

              <div className='inline-flex items-center gap-2 rounded-full border border-[#d7e4f0] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6658]'>
                <ShieldCheck className='h-4 w-4 text-[#1b4332]' aria-hidden='true' />
                {section.articles.length} support topics
              </div>
            </div>

            <div className='mt-6 grid gap-4 lg:grid-cols-2'>
              {section.articles.map((article) => (
                <HelpArticleCard key={article.id} sectionId={section.id} article={article} />
              ))}
            </div>
          </section>
        )
      })}

      {!sections.length ? (
        <section className='rounded-[28px] border border-dashed border-[#d7e4f0] bg-white p-8 text-center shadow-[0_12px_30px_rgba(56,84,122,0.05)]'>
          <p className='text-lg font-semibold text-[#17352b]'>No help topics matched "{query}".</p>
          <p className='mt-2 text-sm text-[#5f6658]'>
            Try a broader search like order, refund, settings, or payment.
          </p>
        </section>
      ) : null}
    </div>
  )
}
