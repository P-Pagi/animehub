/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'animasu.love',
      },
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i3.wp.com',
      },
      {
        protocol: 'https',
        hostname: '*.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'v2.samehadaku.how',
      },
      {
        protocol: 'https',
        hostname: 'samehadaku.how',
      },
    ],
    unoptimized: true,
  },

};

module.exports = nextConfig;
