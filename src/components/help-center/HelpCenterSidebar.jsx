'use client'

import Link from 'next/link'

export default function HelpCenterSidebar({ sections }) {
  return (
    <aside className='hidden xl:block'>
      <div className='sticky top-28 rounded-[28px] border border-[#d7e4f0] bg-[#edf5ff] p-5 shadow-[0_20px_50px_rgba(56,84,122,0.07)]'>
        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7e90]'>
          Help Topics
        </p>
        <div className='mt-5 space-y-5'>
          {sections.map((section) => (
            <div key={section.id}>
              <a
                href={`#${section.id}`}
                className='text-sm font-semibold text-[#1b4332] transition hover:text-[#0d2c23]'
              >
                {section.title}
              </a>
              <ul className='mt-3 space-y-2'>
                {section.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/help/${section.id}/${article.id}`}
                      className='text-sm leading-6 text-[#5f6658] transition hover:text-[#1b4332]'
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
