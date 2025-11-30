/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // IMPORTANT: Base Path for sub-folder deployment
  basePath: '/ku-badminton-reservation',
  assetPrefix: '/ku-badminton-reservation',

  // Fix image loader under basePath
  images: {
    domains: ['localhost', 'your-domain.com'],
    formats: ['image/webp', 'image/avif'],
    path: '/ku-badminton-reservation/_next/image',
  },

  // Server external packages
  serverExternalPackages: ['@prisma/client'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/api/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },

  async redirects() {
    return [];
  },

  async rewrites() {
    return [];
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    return config;
  },

  compress: true,
  poweredByHeader: false,
  trailingSlash: false,

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;


