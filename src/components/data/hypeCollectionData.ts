export interface SliderItem {
  href: string
  src: string
  alt: string
}

export const collectionTitle = 'The Hype Collections'

export const sliderItems: SliderItem[] = [
  {
    href: '/product/xbox-controllers',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase1.jpg',
    alt: 'Xbox controllers',
  },
  {
    href: '/product/nintendo',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase2.png',
    alt: 'Nintendo',
  },
  {
    href: '/product/vr-headset',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase3.jpg',
    alt: 'VR headsets',
  },
  {
    href: '/product/nintendo-alt',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/shoecase6.jpg',
    alt: 'Nintendo',
  },
  {
    href: '/product/xbox-elite',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase8.jpg',
    alt: 'Xbox controllers',
  },
  {
    href: '/product/ps5-accessories',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase4.jpg',
    alt: 'PS5 accessories',
  },
  {
    href: '/product/vr-pack',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase7.jpg',
    alt: 'VR headsets',
  },
  {
    href: '/product/xbox-pro',
    src: 'https://ocprimes.byethost4.com/wp-content/uploads/2025/03/showcase5.jpg',
    alt: 'Xbox controllers',
  },
]

// Helper function to get all slider items
export const getAllSliderItems = (): SliderItem[] => {
  return sliderItems
}
