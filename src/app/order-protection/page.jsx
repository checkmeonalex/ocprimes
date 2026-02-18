export default function OrderProtectionPage() {
  return (
    <main className='min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8'>
        <h1 className='text-2xl font-semibold'>Order Protection Policy</h1>

        <section className='mt-6'>
          <h2 className='text-lg font-semibold'>What&apos;s Covered</h2>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700'>
            <li>Item arrives damaged</li>
            <li>Item is defective</li>
            <li>Item significantly differs from description</li>
          </ul>
        </section>

        <section className='mt-6'>
          <h2 className='text-lg font-semibold'>What&apos;s Not Covered</h2>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700'>
            <li>Change of mind</li>
            <li>Wrong size selected by buyer</li>
            <li>Minor cosmetic issues</li>
            <li>Normal wear and tear</li>
          </ul>
        </section>

        <section className='mt-6'>
          <h2 className='text-lg font-semibold'>Claim Rules</h2>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700'>
            <li>Must submit claim within 48 hours of delivery</li>
            <li>Must upload photo/video evidence</li>
            <li>OCPRIMES reviews claim before approval</li>
          </ul>
        </section>

        <section className='mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4'>
          <h2 className='text-lg font-semibold'>Important</h2>
          <p className='mt-1 text-sm text-slate-700'>
            Order Protection overrides “No Return” policies only for covered issues.
          </p>
        </section>
      </div>
    </main>
  )
}
