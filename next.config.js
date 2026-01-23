/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-b2870c497b454b119731b14f509756fa.r2.dev',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
