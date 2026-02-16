/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // ✅ AGGRESSIVE CACHING & PERFORMANCE
  compress: true,
  productionBrowserSourceMaps: false,
  staticPageGenerationTimeout: 120,
  
  // ✅ INCREMENTAL STATIC REGENERATION (ISR) - Cache pages
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 24 * 7, // 7 days
    pagesBufferLength: 50,
  },
  
  // ✅ IMAGE OPTIMIZATION
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ✅ EXTERNAL PACKAGES
  serverExternalPackages: ['@neondatabase/serverless'],
  
  // ✅ EXPERIMENTAL OPTIMIZATIONS
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
    ],
  },
  
  outputFileTracingRoot: process.cwd(),
  
  // ✅ HEADERS FOR CACHING
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=10, stale-while-revalidate=30' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  
  // ✅ REDIRECTS
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  turbopack: {
    resolveAlias: {
      'underscore': 'lodash'
    }
  },
  
  webpack: (config, { isServer }) => {
    config.optimization.minimize = true
    return config
  }
}

export default nextConfig
