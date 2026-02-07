export default function UserBackendSection({ title, description }) {
  return (
    <div className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
      <h1 className='text-xl font-semibold text-gray-900'>{title}</h1>
      {description ? (
        <p className='mt-2 text-sm text-gray-600'>{description}</p>
      ) : null}
    </div>
  )
}
