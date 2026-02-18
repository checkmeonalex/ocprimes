interface FavoriteItem {
  id: number
  image: string
  title: string
  backgroundUrl: string
}

interface ProductCard {
  id: number
  name: string
  price: string
  category: string
  image: string
  imageParams: { w: number; h: number; fit: string }
  colors: { bg: string; colorDots: string[] }
}

export const layoutContent = {
  left: {
    banners: {
      discount: {
        title: 'GET UP TO 50% OFF',
        buttonText: 'Get Discount',
        backgroundImage:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        imageParams: { w: 400, h: 200, fit: 'crop' },
        minHeight: '185px',
        height: '200px',
        maxHeight: '250px',
      },
      winter: {
        title: "Winter's weekend",
        subtitle: 'keep it casual',
        backgroundImage:
          'https://images.unsplash.com/photo-1445205170230-053b83016050',
        imageParams: { w: 400, h: 200, fit: 'crop' },
        minHeight: '182px',
        height: '200px',
        maxHeight: '250px',
      },
    },
    boldFashion: {
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
      imageParams: { w: 400, h: 300, fit: 'crop' },
      title: 'Bring Bold Fashion',
      subtitle: 'Layers on Layers',
      buttonText: 'Shop Now',
    },
    availableNow: {
      backgroundImage:
        'https://images.unsplash.com/photo-1512436991641-6745cdb1723f',
      imageParams: { w: 200, h: 250, fit: 'crop' },
      buttonText: 'Available Now',
    },
    favorites: {
      items: [
        {
          id: 1,
          image: '/images/homebanner7.jpg',
          title: 'Casual Wear',
          backgroundUrl:
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        },
        {
          id: 2,
          image: '/images/homebanner8.jpg',
          title: 'Summer Style',
          backgroundUrl:
            'https://images.unsplash.com/photo-1445205170230-053b83016050',
        },
        {
          id: 3,
          image: '/images/homebanner3.jpg',
          title: 'Beach Wear',
          backgroundUrl:
            'https://images.unsplash.com/photo-1512436991641-6745cdb1723f',
        },
        {
          id: 4,
          image: '/images/homebanner4.png',
          title: 'Urban Look',
          backgroundUrl:
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
        },
      ] as FavoriteItem[],
    },
  },

  right: {
    summerHome: {
      title: 'Summer home',
      subtitle: 'trends from $6',
      buttonText: 'Shop home',
      backgroundImage:
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
      imageParams: { w: 300, h: 400, fit: 'crop' },
    },
    tweens: {
      title: 'New for tweens, only at',
      subtitle: 'Our Store!',
      buttonText: 'Shop now',
      brand: {
        line1: 'weekend',
        line2: 'academy',
      },
      backgroundImage:
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c',
      imageParams: { w: 300, h: 400, fit: 'crop' },
    },
  },

  center: {
    featured: {
      products: [
        {
          id: 1,
          name: 'WMX Rubber Zebra sandal',
          price: '$46',
          category: 'Our Picks',
          image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          imageParams: { w: 300, h: 400, fit: 'crop' },
          colors: {
            bg: '#e7e2dd',
            colorDots: ['bg-yellow-400', 'bg-black'],
          },
        },
        {
          id: 2,
          name: 'Supper Skiny jogger in brown',
          price: '$89',
          category: 'Your Choice',
          image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246',
          imageParams: { w: 300, h: 400, fit: 'crop' },
          colors: {
            bg: '#f9f9f9',
            colorDots: ['bg-yellow-400', 'bg-black'],
          },
        },
      ] as ProductCard[],
      boldFashion: {
        title: 'Bring Bold Fashion',
        subtitle: 'Layers on Layers',
        buttonText: 'Shop Now',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
        imageParams: { w: 500, h: 300, fit: 'crop' },
      },
    },
    banners: {
      discount: {
        title: 'GET UP TO 50% OFF',
        buttonText: 'Get Discount',
        backgroundImage:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
        imageParams: { w: 400, h: 200, fit: 'crop' },
      },
      winter: {
        title: "Winter's weekend",
        subtitle: 'keep it casual',
        backgroundImage:
          'https://images.unsplash.com/photo-1445205170230-053b83016050',
        imageParams: { w: 400, h: 200, fit: 'crop' },
      },
    },
  },
}
