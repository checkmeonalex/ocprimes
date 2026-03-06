const MastercardBadge = () => (
  <svg
    viewBox='0 -222 2000 2000'
    className='h-8 w-14'
    xmlns='http://www.w3.org/2000/svg'
    aria-label='Mastercard'
    role='img'
  >
    <path fill='#ff5f00' d='M1270.57 1104.15H729.71v-972h540.87Z' />
    <path fill='#eb001b' d='M764 618.17c0-197.17 92.32-372.81 236.08-486A615.46 615.46 0 0 0 618.09 0C276.72 0 0 276.76 0 618.17s276.72 618.17 618.09 618.17a615.46 615.46 0 0 0 382-132.17C856.34 991 764 815.35 764 618.17' />
    <path fill='#f79e1b' d='M2000.25 618.17c0 341.41-276.72 618.17-618.09 618.17a615.65 615.65 0 0 1-382.05-132.17c143.8-113.19 236.12-288.82 236.12-486s-92.32-372.81-236.12-486A615.65 615.65 0 0 1 1382.15 0c341.37 0 618.09 276.76 618.09 618.17' />
  </svg>
)

const VisaBadge = () => (
  <svg viewBox='0 0 66 24' className='h-8 w-16' role='img' aria-label='Visa'>
    <rect x='0.5' y='0.5' width='65' height='23' rx='5.5' fill='white' />
    <text
      x='33'
      y='15'
      textAnchor='middle'
      fontSize='10'
      fontWeight='800'
      fill='#1A1F71'
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      VISA
    </text>
  </svg>
)

const VerveBadge = () => (
  <svg viewBox='0 0 74 24' className='h-8 w-20' role='img' aria-label='Verve'>
    <rect x='0.5' y='0.5' width='73' height='23' rx='5.5' fill='#0b1d4d' />
    <text
      x='37'
      y='15'
      textAnchor='middle'
      fontSize='10'
      fontWeight='800'
      fill='white'
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      VERVE
    </text>
  </svg>
)

const AmexBadge = () => (
  <svg viewBox='0 0 74 24' className='h-8 w-20' role='img' aria-label='American Express'>
    <rect x='0.5' y='0.5' width='73' height='23' rx='5.5' fill='#2E77BC' />
    <text
      x='37'
      y='15'
      textAnchor='middle'
      fontSize='9'
      fontWeight='800'
      fill='white'
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      AMEX
    </text>
  </svg>
)

const BankTransferBadge = () => (
  <svg viewBox='0 0 96 24' className='h-8 w-[108px]' role='img' aria-label='Bank transfer'>
    <rect x='0.5' y='0.5' width='95' height='23' rx='5.5' fill='#F8FAFC' />
    <path d='M10.5 11.6 15.5 8.5l5 3.1v.9h-10Z' fill='#334155' />
    <path d='M11.5 12.5h1.6v3h-1.6Zm2.45 0h1.6v3h-1.6Zm2.45 0H18v3h-1.6Z' fill='#334155' />
    <path d='M10.5 16.4h10' stroke='#334155' strokeWidth='1.2' />
    <text
      x='56'
      y='15'
      textAnchor='middle'
      fontSize='8.5'
      fontWeight='700'
      fill='#334155'
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      BANK TRANSFER
    </text>
  </svg>
)

const UssdBadge = () => (
  <svg viewBox='0 0 70 24' className='h-8 w-[84px]' role='img' aria-label='USSD'>
    <rect x='0.5' y='0.5' width='69' height='23' rx='5.5' fill='#ECFDF5' />
    <text
      x='35'
      y='15'
      textAnchor='middle'
      fontSize='9.5'
      fontWeight='800'
      fill='#047857'
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      *737#
    </text>
  </svg>
)

const PaymentMethodBadges = () => {
  return (
    <div className='mt-2.5 flex flex-wrap items-center gap-3'>
      <VisaBadge />
      <MastercardBadge />
      <VerveBadge />
      <AmexBadge />
      <BankTransferBadge />
      <UssdBadge />
    </div>
  )
}

export default PaymentMethodBadges
