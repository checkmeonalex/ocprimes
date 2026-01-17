export const storeProfile = {
  name: 'OcPrimes HQ',
  balance: '$13,650',
  role: 'Operations lead',
}

export const dashboardStats = [
  { label: 'Total Visitors', value: '45,987', change: '12.8%' },
  { label: 'Total Products', value: '632', change: '8.5%' },
  { label: 'Product Views', value: '25,987', change: '9.1%' },
  { label: 'Average Orders', value: '1,214', change: '2.1%' },
]

export const dashboardComments = [
  { id: 'c1', name: 'Abir Mahmud', text: 'Loved the new arrivals on the home page.' },
  { id: 'c2', name: 'Jessic Pio', text: 'Sizing guide update looks great. Thanks!' },
  { id: 'c3', name: 'Handal Kawa', text: 'Need a restock notification for the Nike drop.' },
]

export const products = [
  {
    id: 'p-1',
    name: 'OcPrime Runner',
    sku: 'OP-RUN-144',
    price: '$129.00',
    status: 'Active',
    stock: '124 in stock',
  },
  {
    id: 'p-2',
    name: 'Studio Hoodie',
    sku: 'OP-HDY-221',
    price: '$79.00',
    status: 'Active',
    stock: '42 in stock',
  },
  {
    id: 'p-3',
    name: 'Trail Backpack',
    sku: 'OP-BAG-009',
    price: '$98.00',
    status: 'Draft',
    stock: 'No stock',
  },
  {
    id: 'p-4',
    name: 'Monochrome Tee',
    sku: 'OP-TEE-832',
    price: '$45.00',
    status: 'Archived',
    stock: 'Archived',
  },
]

export const recentOrders = [
  { id: 'o-1', customer: 'Jordan Lee', total: '$240.00', status: 'Packed' },
  { id: 'o-2', customer: 'Mia Chen', total: '$89.00', status: 'Shipped' },
  { id: 'o-3', customer: 'Liam Cruz', total: '$150.00', status: 'Processing' },
]

export const mediaItems = Array.from({ length: 12 }).map((_, index) => ({
  id: `m-${index + 1}`,
  title: `Campaign asset ${index + 1}`,
  size: `${(index + 2) * 2} MB`,
}))

export const sizeGuides = [
  { id: 'sg-1', title: 'Mens Sneakers', category: 'Footwear', updated: 'Aug 18, 2024' },
  { id: 'sg-2', title: 'Womens Activewear', category: 'Apparel', updated: 'Aug 12, 2024' },
  { id: 'sg-3', title: 'Kids Essentials', category: 'Kids', updated: 'Jul 29, 2024' },
]

export const customers = [
  {
    id: 'cust-1',
    name: 'Abir Mahmud',
    email: 'abir@ocprimes.com',
    tier: 'VIP',
    total: '$1,240',
  },
  {
    id: 'cust-2',
    name: 'Jessic Pio',
    email: 'jessic@ocprimes.com',
    tier: 'Gold',
    total: '$860',
  },
  {
    id: 'cust-3',
    name: 'Handal Kawa',
    email: 'handal@ocprimes.com',
    tier: 'Silver',
    total: '$540',
  },
]
