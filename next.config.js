/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // IMPORTANT: Base Path for sub-folder deployment (disabled for UAT)
  // basePath: '/ku-badminton-reservation',
  // assetPrefix: '/ku-badminton-reservation',

  // Fix image loader under basePath
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // {
      //   protocol: 'https',
      //   hostname: 'your-domain.com',
      // },
      {
        protocol: 'http',
        hostname: '158.108.196.150',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    // Disable optimization for /uploads/ paths (served directly by nginx)
    unoptimized: process.env.NODE_ENV === 'production',
    // path: '/ku-badminton-reservation/_next/image',
  },

  // Server external packages
  serverExternalPackages: ['@prisma/client'],

  // Security headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          // TODO: Enable CSP with upgrade-insecure-requests when SSL is configured
          // {
          //   key: 'Content-Security-Policy',
          //   value: [
          //     "default-src 'self'",
          //     "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
          //     "style-src 'self' 'unsafe-inline'",
          //     "img-src 'self' data: https:",
          //     "font-src 'self' data:",
          //     "connect-src 'self'",
          //     "frame-src https://www.google.com",
          //     "object-src 'none'",
          //     "base-uri 'self'",
          //     "form-action 'self'",
          //     "frame-ancestors 'none'",
          //     "upgrade-insecure-requests"
          //   ].join('; ')
          // },
          // TODO: Enable HSTS when SSL is configured
          // ...(isProduction ? [{
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=63072000; includeSubDomains; preload'
          // }] : [])
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/api/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
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
    return [
      // No rewrite needed - API route matches the path structure
    ];
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Turbopack config (Next.js 16+ uses Turbopack by default)
  turbopack: {},
  
  // Webpack config removed - using Turbopack instead
  // If you need webpack-specific configs, migrate them to Turbopack
  // See: https://nextjs.org/docs/app/api-reference/next-config-js/turbopack

  compress: true,
  poweredByHeader: false,
  trailingSlash: false,

  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;


