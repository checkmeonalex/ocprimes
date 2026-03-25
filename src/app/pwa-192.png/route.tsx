import { renderPwaIcon } from '../../lib/pwa/icon'

export async function GET() {
  return renderPwaIcon({
    size: 192,
    background: 'linear-gradient(135deg, #f8f1e7 0%, #f4e5d2 100%)',
    cardBackground: 'transparent',
    inset: 24,
  })
}
