/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  // 🚀 PERFORMANCE: Enable compression
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    domains: [
      'speechbob.blob.core.windows.net',
      'wecare-ii.crm5.dynamics.com',
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  transpilePackages: ['react-toastify'],

  // CSP cho development và production
  async headers() {
    // CSP cho development - cho phép webpack dev server và HMR
    const devCSP = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com;
      connect-src 'self' webpack://* ws://localhost:* wss://localhost:* https://www.google-analytics.com https://analytics.google.com https://ssl.google-analytics.com https://www.googletagmanager.com;
      img-src 'self' data: https:;
      style-src 'self' 'unsafe-inline' https:;
      font-src 'self' https:;
      frame-src 'self' https://drive.google.com https://docs.google.com https://www.googletagmanager.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `;

    // CSP cho production - bảo mật hơn, loại bỏ webpack dev server
    const prodCSP = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com;
      connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://ssl.google-analytics.com https://www.googletagmanager.com;
      img-src 'self' data: https:;
      style-src 'self' 'unsafe-inline' https:;
      font-src 'self' https:;
      frame-src 'self' https://drive.google.com https://docs.google.com https://www.googletagmanager.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `;

    const isDevelopment = process.env.NODE_ENV === 'development';
    const cspValue = (isDevelopment ? devCSP : prodCSP).replace(/\s+/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspValue
          }
        ]
      },
      // 🚀 PERFORMANCE: Cache headers for API routes
      {
        source: '/api/admin-app/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ]
      },
      // 🚀 PERFORMANCE: Cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ]
      },
    ];
  },
  // Cải thiện hot reload
  webpack: (config, { isServer, dev }) => {
    // 🚀 PERFORMANCE: Enable persistent caching for faster rebuilds
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: join(__dirname, '.next', 'cache'),
      };
    }

    // Add a rule to handle mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    // Fix CSS loading from node_modules
    const oneOfRule = config.module.rules.find((rule) => rule.oneOf);
    if (oneOfRule) {
      oneOfRule.oneOf.forEach((rule) => {
        if (
          rule.test &&
          rule.test.toString().match(/css|scss|sass/) &&
          rule.exclude
        ) {
          if (Array.isArray(rule.exclude)) {
            rule.exclude = rule.exclude.filter((exclude) => {
              if (typeof exclude === 'string') {
                return !exclude.includes('node_modules');
              }
              if (exclude && exclude.toString) {
                const excludeStr = exclude.toString();
                return !excludeStr.includes('node_modules');
              }
              return true;
            });
          } else if (typeof rule.exclude === 'function') {
            const originalExclude = rule.exclude;
            rule.exclude = (filePath) => {
              if (filePath.includes('node_modules') && /\.css$/.test(filePath)) {
                return false;
              }
              return originalExclude(filePath);
            };
          } else if (rule.exclude && rule.exclude.toString) {
            const excludeStr = rule.exclude.toString();
            if (excludeStr.includes('node_modules')) {
              const originalExclude = rule.exclude;
              rule.exclude = (filePath) => {
                if (filePath.includes('node_modules') && /\.css$/.test(filePath)) {
                  return false;
                }
                if (originalExclude instanceof RegExp) {
                  return originalExclude.test(filePath);
                }
                return true;
              };
            }
          }
        }
      });
    }

    // Configure for react-pdf
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Cải thiện hot reload cho development
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
  // Cải thiện development experience và bundle optimization
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react', '@mui/material', '@mui/icons-material'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  async rewrites() {
    return [
      {
        source: '/san-pham/chi-tiet/:masanpham',
        destination: '/:masanpham',
      },
      {
        source: '/san-pham-:slug',
        destination: '/san-pham/:slug',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/san-pham/chi-tiet/:masanpham',
        destination: '/:masanpham',
        permanent: true,
      },
      {
        source: '/san-pham/:slug',
        destination: '/san-pham-:slug',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
