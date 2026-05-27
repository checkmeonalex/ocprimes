import Link from 'next/link'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function TrustPageLayout({ page }) {
  const articleSections = page.content || page.sections || []

  return (
    <main className='min-h-screen bg-[rgb(253_253_253)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-[1380px]'>
        <div className='mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500'>
          <Link href='/' className='transition hover:text-slate-900'>
            Home
          </Link>
          <span>/</span>
          <Link
            href={page.group === 'legal' ? '/legal/terms-of-service' : '/about/about-us'}
            className='transition hover:text-slate-900'
          >
            {page.group === 'legal' ? 'Legal' : 'About Alxora'}
          </Link>
          <span>/</span>
          <span className='font-medium text-slate-900'>{page.title}</span>
        </div>

        <section className='overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#ecf5ff_0%,#f8fbff_55%,#ffffff_100%)] p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)] lg:items-start'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600'>
                <ShieldCheck className='h-4 w-4 text-slate-700' aria-hidden='true' />
                {page.eyebrow}
              </div>
              <h1 className='mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl'>
                {page.title}
              </h1>
              {page.lastUpdated ? (
                <p className='mt-4 text-sm font-medium uppercase tracking-[0.14em] text-slate-500'>
                  Last updated: {page.lastUpdated}
                </p>
              ) : null}
              <p className='mt-5 max-w-3xl text-lg leading-8 text-slate-700'>{page.description}</p>
              <p className='mt-5 max-w-3xl text-base leading-8 text-slate-600'>{page.intro}</p>
            </div>

            <div className='rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                What matters here
              </p>
              <ul className='mt-4 space-y-4'>
                {page.highlights.map((item) => (
                  <li key={item} className='flex items-start gap-3 text-sm leading-6 text-slate-700'>
                    <Sparkles className='mt-1 h-4 w-4 shrink-0 text-slate-500' aria-hidden='true' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className='mt-10 grid gap-8 xl:grid-cols-[260px,minmax(0,1fr)]'>
          <aside className='xl:sticky xl:top-24 xl:self-start'>
            <div className='rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                On this page
              </p>
              <div className='mt-4 space-y-3'>
                {articleSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className='block rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:text-slate-950'
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className='space-y-8'>
            {page.content ? (
              <article className='rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.05)] sm:p-8'>
                <div className='space-y-12'>
                  {articleSections.map((section) => (
                    <section key={section.id} id={section.id} className='scroll-mt-28'>
                      <h2 className='text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.65rem]'>
                        {section.title}
                      </h2>
                      <div className='mt-5 space-y-5 text-[17px] leading-8 text-slate-700'>
                        {section.paragraphs?.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.bullets?.length ? (
                          <ul className='list-disc space-y-3 pl-6 text-slate-700'>
                            {section.bullets.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : null}
                        {section.paragraphsAfterBullets?.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.secondaryBullets?.length ? (
                          <ul className='list-disc space-y-3 pl-6 text-slate-700'>
                            {section.secondaryBullets.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            ) : (
              articleSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className='scroll-mt-28 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.05)] sm:p-8'
                >
                  <h2 className='text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.65rem]'>
                    {section.title}
                  </h2>
                  <div className='mt-5 space-y-5 text-[17px] leading-8 text-slate-700'>
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className='list-disc space-y-3 pl-6 text-slate-700'>
                        {section.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {section.paragraphsAfterBullets?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.secondaryBullets?.length ? (
                      <ul className='list-disc space-y-3 pl-6 text-slate-700'>
                        {section.secondaryBullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))
            )}

            <section className='rounded-[30px] border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] sm:px-8'>
              <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
                <div className='max-w-2xl'>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/60'>
                    Next step
                  </p>
                  <h2 className='mt-2 text-2xl font-semibold tracking-tight'>{page.cta.title}</h2>
                  <p className='mt-3 text-sm leading-7 text-white/72'>{page.cta.description}</p>
                </div>
                <div className='flex flex-wrap gap-3'>
                  <Link
                    href={page.cta.primaryHref}
                    className='inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100'
                  >
                    {page.cta.primaryLabel}
                    <ArrowRight className='h-4 w-4' aria-hidden='true' />
                  </Link>
                  {page.cta.secondaryHref ? (
                    <Link
                      href={page.cta.secondaryHref}
                      className='inline-flex items-center gap-2 rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6'
                    >
                      {page.cta.secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
