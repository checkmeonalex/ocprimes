export default function UserBackendSection({ title, description }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h1 className='text-xl font-semibold text-slate-900'>{title}</h1>
      {description ? (
        <p className='mt-2 text-sm text-slate-600'>{description}</p>
      ) : null}
    </div>
  )
}
