// src/data/products.js
const baseProducts = [
  {
    id: 1,
    name: 'Classic White Sneakers',
    slug: 'classic-white-sneakers',
    category: 'Footwear',
    vendor: 'Nike',
    vendorFont: 'Arial, sans-serif',
    shortDescription:
      'Minimal white sneakers with soft lining and a grippy rubber sole.',
    fullDescription:
      'Built for everyday wear, the Classic White Sneakers keep a clean profile while delivering comfort that lasts. A cushioned footbed and breathable panels reduce fatigue on long days, and the rubber outsole adds dependable traction. Wear them with denim, joggers, or tailored pieces for a crisp, modern finish.',
    price: 89.99,
    originalPrice: 129.99,
    rating: 4.5,
    reviews: 128,
    colors: ['white', 'black', 'gray', 'red', 'blue'],
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    isTrending: false,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 15,
  },
  {
    id: 2,
    name: 'Premium Sports Watch',
    slug: 'premium-sports-watch',
    category: 'Accessories',
    vendor: 'Apple',
    vendorFont: 'Helvetica, sans-serif',
    shortDescription:
      'Sporty watch with a lightweight case, bright display, and easy strap.',
    fullDescription:
      'The Premium Sports Watch keeps workouts and daily routines on track with a crisp, responsive display and a lightweight, sweat-ready build. A secure clasp, quick-glance metrics, and all-day comfort make it a dependable companion for training, travel, and work. Designed to look sharp beyond the gym without sacrificing performance. The casing resists scuffs, while the band stays breathable through long sessions. It is the kind of watch you can wear from morning runs straight into meetings.',
    price: 199.99,
    rating: 4.8,
    reviews: 89,
    colors: ['black', 'navy', 'red'],
    sizes: ['S', 'M', 'L'],
    isTrending: true,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 2, // Almost sold out!
  },
  {
    id: 3,
    name: 'Designer Leather Jacket',
    slug: 'designer-leather-jacket',
    category: 'Clothing',
    vendor: 'Zara',
    vendorFont: 'Georgia, serif',
    shortDescription:
      'Sleek leather jacket with a tailored shape and soft inner lining.',
    fullDescription:
      'Crafted from smooth leather with a structured silhouette, this Designer Leather Jacket elevates everyday outfits with a refined edge. The interior is softly lined for comfort, while the collar and cuffs are shaped to keep clean lines. Pair it with boots or sneakers for a polished street-ready look that holds up season after season.',
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.7,
    reviews: 156,
    colors: ['black', 'brown', 'tan'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 10,
  },
  {
    id: 4,
    name: 'Wireless Headphones',
    slug: 'wireless-headphones',
    category: 'Electronics',
    vendor: 'Sony',
    vendorFont: 'Trebuchet MS, sans-serif',
    shortDescription:
      'Wireless headphones with deep bass, soft pads, and long wear comfort.',
    fullDescription:
      'These Wireless Headphones deliver clear highs and weighty bass in a lightweight, studio-inspired frame. Plush ear cushions reduce pressure during long sessions, and the foldable design slips easily into a bag. Whether you are commuting or working, the sound stays balanced and immersive without overwhelming the mix. The controls are simple to reach, and the build stays comfortable even after hours of use.',
    price: 149.99,
    rating: 4.6,
    reviews: 203,
    colors: ['black', 'white', 'blue'],
    isTrending: true,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 1,
  },
  {
    id: 5,
    name: 'Minimalist Backpack',
    slug: 'minimalist-backpack',
    category: 'Accessories',
    vendor: 'Herschel',
    vendorFont: 'Times New Roman, serif',
    shortDescription:
      'Minimal backpack with smart storage and a clean, structured shape.',
    fullDescription:
      'The Minimalist Backpack keeps everyday carry simple with a roomy main compartment and quick-access pockets. A structured build helps it hold its shape, while the padded straps stay comfortable on the move. It is a reliable choice for campus, travel, or a tidy commute.',
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.4,
    reviews: 92,
    colors: ['black', 'gray', 'navy'],
    isTrending: false,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 20,
  },
  {
    id: 6,
    name: 'Running Shoes',
    slug: 'running-shoes',
    category: 'Footwear',
    vendor: 'Adidas',
    vendorFont: 'Courier New, monospace',
    shortDescription:
      'Lightweight running shoes with responsive cushioning and airy mesh.',
    fullDescription:
      'Designed for smooth miles, the Running Shoes blend responsive cushioning with a breathable mesh upper to keep feet cool and supported. The midsole absorbs impact without feeling heavy, and the outsole pattern grips well on pavement. Ideal for daily runs, training sessions, or comfortable all-day wear.',
    price: 129.99,
    rating: 4.5,
    reviews: 178,
    colors: ['red', 'blue', 'black'],
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    isTrending: true,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 3,
  },
  {
    id: 7,
    name: 'Casual T-Shirt',
    slug: 'casual-t-shirt',
    category: 'Clothing',
    vendor: 'H&M',
    vendorFont: 'Verdana, sans-serif',
    shortDescription:
      'Easygoing tee with a soft hand feel and relaxed everyday fit.',
    fullDescription:
      'This Casual T-Shirt is cut for comfort with a soft, breathable fabric that wears well on its own or layered. Clean seams and a relaxed fit make it a staple that pairs with denim, shorts, or joggers. A simple essential built for repeat wear.',
    price: 29.99,
    originalPrice: 39.99,
    rating: 4.2,
    reviews: 134,
    colors: ['white', 'black', 'gray', 'navy'],
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 25,
  },
  {
    id: 8,
    name: 'Smart Fitness Tracker',
    slug: 'smart-fitness-tracker',
    category: 'Electronics',
    vendor: 'Fitbit',
    vendorFont: 'Impact, sans-serif',
    shortDescription:
      'Slim fitness tracker with a bright screen and all-day comfort.',
    fullDescription:
      'The Smart Fitness Tracker focuses on daily progress with a clear display, quick-swipe navigation, and a lightweight band that stays comfortable from morning to night. Track steps, workouts, and recovery at a glance, then sync for deeper insights. A clean design keeps it subtle while still feeling premium.',
    price: 99.99,
    rating: 4.3,
    reviews: 87,
    colors: ['black', 'pink', 'blue'],
    isTrending: true,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 12,
  },
  {
    id: 9,
    name: 'Vintage Denim Jeans',
    slug: 'vintage-denim-jeans',
    category: 'Clothing',
    vendor: "Levi's",
    vendorFont: 'Palatino, serif',
    shortDescription:
      'Vintage-inspired denim with a flattering rise and sturdy weave.',
    fullDescription:
      'These Vintage Denim Jeans blend a classic rise with a sturdy, broken-in feel. The leg is balanced for daily wear and works with boots or sneakers. Built to keep their shape while softening over time.',
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.3,
    reviews: 167,
    colors: ['blue', 'black', 'gray'],
    sizes: ['28', '30', '32', '34', '36'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 18,
  },
  {
    id: 10,
    name: 'Bluetooth Speaker',
    slug: 'bluetooth-speaker',
    category: 'Electronics',
    vendor: 'JBL',
    vendorFont: 'Comic Sans MS, cursive',
    shortDescription:
      'Compact speaker with punchy sound and a grab-and-go size.',
    fullDescription:
      'The Bluetooth Speaker packs bold sound into a compact form for desk setups, kitchens, or outdoor hangs. A durable shell and simple controls keep it easy to use, while the tuned drivers deliver strong mids and bass. Pair it in seconds and let it play without fuss.',
    price: 59.99,
    rating: 2.1,
    reviews: 234,
    colors: ['black', 'red', 'blue'],
    isTrending: false,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 1, // Almost sold out!
  },
  {
    id: 11,
    name: 'Stylish Sunglasses',
    slug: 'stylish-sunglasses',
    category: 'Accessories',
    vendor: 'Ray-Ban',
    vendorFont: 'Brush Script MT, cursive',
    shortDescription:
      'Classic sunglasses with a sharp silhouette and UV protection.',
    fullDescription:
      'Stylish Sunglasses bring a timeless shape with a clean, confident profile. Lightweight frames sit comfortably, and tinted lenses help reduce glare for everyday wear. Easy to dress up or down, they stay polished season after season.',
    price: 119.99,
    originalPrice: 159.99,
    rating: 2.0,
    reviews: 98,
    colors: ['black', 'brown', 'navy'],
    isTrending: false,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
       'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 7,
  },
  {
    id: 12,
    name: 'Canvas High-Top Sneakers',
    slug: 'canvas-high-top-sneakers',
    category: 'Footwear',
    vendor: 'Converse',
    vendorFont: 'Lucida Console, monospace',
    shortDescription:
      'High-top sneakers with canvas build and a classic rubber toe.',
    fullDescription:
      'Canvas High-Top Sneakers deliver a familiar silhouette with durable stitching and a supportive ankle profile. The rubber toe cap adds protection, while the vulcanized sole keeps the feel steady. A timeless option that pairs with denim, cargos, or shorts.',
    price: 65.99,
    rating: 4.4,
    reviews: 145,
    colors: ['white', 'red', 'black'],
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
    isTrending: true,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 9,
  },
  {
    id: 13,
    name: 'Cozy Hoodie',
    slug: 'cozy-hoodie',
    category: 'Clothing',
    vendor: 'Champion',
    vendorFont: 'Tahoma, sans-serif',
    shortDescription:
      'Soft hoodie with cozy fleece lining and a roomy front pocket.',
    fullDescription:
      'The Cozy Hoodie is built for layered comfort with a warm fleece interior and a relaxed cut that stays easy to move in. A double-layer hood and ribbed cuffs help lock in warmth, while the kangaroo pocket adds everyday utility. Perfect for cool mornings, travel, or laid-back weekends. The fabric keeps its shape after repeat washes, so it stays a reliable favorite.',
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.2,
    reviews: 201,
    colors: ['gray', 'black', 'navy', 'white'],
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 11,
  },
  {
    id: 14,
    name: 'Leather Wallet',
    slug: 'leather-wallet',
    category: 'Accessories',
    vendor: 'Fossil',
    vendorFont: 'Book Antiqua, serif',
    shortDescription:
      'Compact leather wallet with clean stitching and smart card slots.',
    fullDescription:
      'This Leather Wallet keeps essentials organized with a slim profile and sturdy build. Multiple card slots and a cash sleeve hold the basics without bulk. Smooth leather finishes the look with a classic, durable feel.',
    price: 39.99,
    rating: 4.7,
    reviews: 312,
    colors: ['brown', 'black', 'tan'],
    isTrending: false,
    isPortrait: false,
    image:
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 14,
  },
  {
    id: 15,
    name: 'Urban Bomber Jacket',
    slug: 'urban-bomber-jacket',
    category: 'Clothing',
    vendor: 'Elenzga',
    vendorFont: 'Garamond, serif',
    shortDescription:
      'Modern bomber jacket with a sleek finish and street-ready fit.',
    fullDescription:
      'The Urban Bomber Jacket blends a crisp silhouette with practical warmth for transitional days. A smooth outer shell, ribbed cuffs, and a clean zip front give it a sharp finish that layers easily. Style it with denim or tailored pants for a versatile city-ready look.',
    price: 89.99,
    originalPrice: 119.99,
    rating: 4.5,
    reviews: 145,
    colors: ['black', 'olive', 'navy'],
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: true,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1580047883831-5db03837b0b3?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1580047883831-5db03837b0b3?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 3,
  },
  {
    id: 16,
    name: 'Elegant Summer Dress',
    slug: 'elegant-summer-dress',
    category: 'Clothing',
    vendor: 'Mango',
    vendorFont: 'Playfair Display, serif',
    shortDescription:
      'Breezy summer dress with a flowing shape and soft drape.',
    fullDescription:
      'Elegant Summer Dress brings a light, airy feel with a flattering waist and a skirt that moves with you. The fabric is soft against the skin and designed to keep its shape throughout the day. Perfect for warm evenings, celebrations, or a polished day look with minimal effort. Pair it with sandals for daytime ease or add heels for a more refined finish. Elegant Summer Dress brings a light, airy feel with a flattering waist and a skirt that moves with you. The fabric is soft against the skin and designed to keep its shape throughout the day. Perfect for warm evenings, celebrations, or a polished day look with minimal effort. Pair it with sandals for daytime ease or add heels for a more refined finish.Elegant Summer Dress brings a light, airy feel with a flattering waist and a skirt that moves with you. The fabric is soft against the skin and designed to keep its shape throughout the day. Perfect for warm evenings, celebrations, or a polished day look with minimal effort. Pair it with sandals for daytime ease or add heels for a more refined finish.',
    price: 69.99,
    originalPrice: 89.99,
    rating: 4.6,
    reviews: 234,
    colors: ['floral', 'navy', 'white', 'pink'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isTrending: true,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 8,
  },
  {
    id: 17,
    name: 'Professional Blazer',
    slug: 'professional-blazer',
    category: 'Clothing',
    vendor: 'Calvin Klein',
    vendorFont: 'Montserrat, sans-serif',
    shortDescription:
      'Tailored blazer with clean lines and a structured shoulder.',
    fullDescription:
      'The Professional Blazer offers a sharp, tailored look with a structured shoulder and smooth lapels that stay crisp. Fully lined for comfort, it layers easily over shirts or knits without adding bulk. A dependable piece for meetings, events, and refined everyday wear.',
    price: 149.99,
    originalPrice: 199.99,
    rating: 4.4,
    reviews: 167,
    colors: ['black', 'navy', 'gray', 'burgundy'],
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 12,
  },
  {
    id: 18,
    name: 'Vintage Band T-Shirt',
    slug: 'vintage-band-t-shirt',
    category: 'Clothing',
    vendor: 'Urban Outfitters',
    vendorFont: 'Rock Salt, cursive',
    shortDescription:
      'Soft band tee with a worn-in feel and relaxed vintage cut.',
    fullDescription:
      'The Vintage Band T-Shirt features a lived-in hand feel and a relaxed fit that pairs well with denim or cargo pants. The print is distressed for a retro touch. Easy to wear, easy to style.',
    price: 34.99,
    rating: 4.3,
    reviews: 89,
    colors: ['black', 'white', 'gray'],
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: true,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1583743814966-8936f37f4ec6?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583743814966-8936f37f4ec6?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 6,
  },
  {
    id: 19,
    name: 'Flowing Maxi Skirt',
    slug: 'flowing-maxi-skirt',
    category: 'Clothing',
    vendor: 'Free People',
    vendorFont: 'Dancing Script, cursive',
    shortDescription:
      'Flowy maxi skirt with a soft waistband and easy movement.',
    fullDescription:
      'Flowing Maxi Skirt is designed for movement with a gentle drape and a comfortable waistband that sits smoothly. The long silhouette adds drama without feeling heavy, making it ideal for day-to-night styling. Pair it with a fitted top or a loose knit for a balanced look.',
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.5,
    reviews: 145,
    colors: ['burgundy', 'olive', 'black', 'floral'],
    sizes: ['XS', 'S', 'M', 'L'],
    isTrending: false,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 15,
  },

  {
    id: 20,
    name: 'Casual Crop Top',
    slug: 'casual-crop-top',
    category: 'Clothing',
    vendor: 'Brandy Melville',
    vendorFont: 'Quicksand, sans-serif',
    shortDescription:
      'Cropped top with a simple cut and easy, everyday styling.',
    fullDescription:
      'The Casual Crop Top keeps things easy with a clean neckline and soft fabric that feels good against the skin. Its cropped length pairs well with high-rise denim or skirts for a balanced silhouette. A go-to piece for warm weather or layered looks.',
    price: 24.99,
    rating: 4.1,
    reviews: 278,
    colors: ['white', 'black', 'pink', 'sage'],
    sizes: ['One Size'],
    isTrending: true,
    isPortrait: true,
    image:
      'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?auto=format&fit=crop&w=400&h=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?auto=format&fit=crop&w=400&h=600&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    ],
    stock: 2,
  },
]

const materialByCategory = {
  Footwear: 'Leather & Rubber',
  Accessories: 'Aluminum & Glass',
  Clothing: 'Cotton Blend',
  Electronics: 'Aluminum & Plastic',
}

const dimensionsByCategory = {
  Footwear: '12 x 5 x 4 in',
  Accessories: '8 x 4 x 2 in',
  Clothing: '24 x 18 x 2 in',
  Electronics: '10 x 7 x 3 in',
}

export const productsData = baseProducts.map((product, index) => {
  const sku = `SKU-${String(index + 1).padStart(4, '0')}`
  const shortDescription = product.shortDescription ?? ''
  const fullDescription = product.fullDescription ?? ''
  const stockRemaining = product.stock ?? 0
  const vendorRating = Number(
    Math.min(5, Math.max(3.9, product.rating + 0.4)).toFixed(2)
  )
  const vendorFollowers = Math.max(120, product.reviews * 3 + 75)
  const vendorSoldCount = `${Math.max(8, Math.round(product.reviews * 0.5))}K+`
  const vendorItemsCount = Math.max(12, Math.round(product.reviews / 6))
  const vendorBadge = product.isTrending ? 'Star seller' : 'Top seller'
  const material =
    materialByCategory[product.category] || 'Premium Mixed Materials'
  const dimensions =
    dimensionsByCategory[product.category] || '10 x 6 x 3 in'
  const shippingEstimate = 'Ships in 3-5 business days'
  const tags = [
    product.category,
    product.vendor,
    product.isTrending ? 'Trending' : 'Popular',
  ]
  const variationsSource = product.gallery?.length
    ? product.gallery
    : [product.image]
  const variations = variationsSource.slice(0, 6).map((img, idx) => {
    const priceDelta = (idx + 1) * 2.5
    const variationPrice = Math.max(5, product.price + priceDelta)
    const variationOriginal = product.originalPrice
      ? Math.max(variationPrice + 10, product.originalPrice + priceDelta)
      : null

    return {
      id: `${product.slug}-var-${idx + 1}`,
      label: `Variant ${idx + 1}`,
      image: img,
      price: Number(variationPrice.toFixed(2)),
      originalPrice: variationOriginal
        ? Number(variationOriginal.toFixed(2))
        : null,
      sku: `${sku}-V${idx + 1}`,
      inStock: product.stock > 0,
    }
  })

  return {
    ...product,
    sku,
    shortDescription,
    fullDescription,
    stockRemaining,
    vendorRating,
    vendorFollowers,
    vendorSoldCount,
    vendorItemsCount,
    vendorBadge,
    material,
    dimensions,
    shippingEstimate,
    tags,
    variations,
  }
})
