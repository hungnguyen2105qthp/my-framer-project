/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure CSP headers to allow Firebase operations
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://apis.google.com https://us.i.posthog.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us.i.posthog.com https://us-assets.i.posthog.com wss: ws:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // ===== ĐÃ SỬA DÒNG NÀY =====
              "frame-ancestors 'self' https://*.framer.app https://*.framer.com",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // ===== ĐÃ THÊM HEADER NÀY =====
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://*.framer.com'
          }
        ]
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/flags',
        destination: 'https://us.i.posthog.com/flags',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely ignore Firebase Admin SDK and related files on client-side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/firebase-admin': false,
        '@/lib/analytics-utils': false,
        'firebase-admin': false,
        'firebase-admin/app': false,
        'firebase-admin/firestore': false,
        'firebase-admin/auth': false,
        'firebase-admin/storage': false,
        'firebase-admin/functions': false,
        'firebase-admin/database': false,
        'firebase-admin/messaging': false,
        'firebase-admin/remote-config': false,
        'firebase-admin/machine-learning': false,
        'firebase-admin/project-management': false,
        'firebase-admin/security-rules': false,
        'firebase-admin/instance-id': false,
        // Handle node: URI scheme
        'node:events': false,
        'node:fs': false,
        'node:net': false,
        'node:tls': false,
        'node:child_process': false,
        'node:process': false,
        'node:util': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:url': false,
        'node:querystring': false,
        'node:http': false,
        'node:https': false,
        'node:zlib': false,
        'node:assert': false,
        'node:constants': false,
        'node:domain': false,
        'node:punycode': false,
        'node:string_decoder': false,
        'node:timers': false,
        'node:tty': false,
        'node:vm': false,
        'node:worker_threads': false,
      }
      
      // Don't resolve Node.js modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        events: false,
        process: false,
        util: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        assert: false,
        constants: false,
        domain: false,
        punycode: false,
        string_decoder: false,
        timers: false,
        tty: false,
        vm: false,
        worker_threads: false,
      }
    }

    // Handle Firebase ESM modules properly
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push({
        'firebase/app': 'firebase/app',
        'firebase/firestore': 'firebase/firestore',
        'firebase/auth': 'firebase/auth',
        'firebase/storage': 'firebase/storage'
      })
    }
    
    return config
  },
}

export default nextConfig