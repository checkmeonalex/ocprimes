import { BRAND_NAME, BRAND_SEARCH_DESCRIPTION } from '../lib/brand'

export default function manifest() {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: BRAND_SEARCH_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f1e7',
    theme_color: '#2f2019',
    categories: ['shopping', 'lifestyle'],
    lang: 'en-NG',
    icons: [
      {
        src: '/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
