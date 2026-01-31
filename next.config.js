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
      {
        protocol: 'https',
        hostname: 'b9b7d0b879bd0904893b949b1a0101e7.r2.cloudflarestorage.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
