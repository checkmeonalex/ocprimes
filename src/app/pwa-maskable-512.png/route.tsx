import { renderPwaIcon } from '../../lib/pwa/icon'

export async function GET() {
  return renderPwaIcon({
    size: 512,
    background: '#2f2019',
    cardBackground: 'linear-gradient(135deg, #6c4c3a 0%, #2f2019 100%)',
    inset: 72,
    borderRadius: '30%',
  })
}
