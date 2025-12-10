/** @type {import('next').NextConfig} */
const nextConfig = {
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
      }
    ];
  },
  // Cải thiện hot reload
  webpack: (config, { isServer, dev }) => {
    // Add a rule to handle mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    
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
  // Cải thiện development experience
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react'],
  },
  
  // Tắt source maps trong production để bảo mật
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      {
        source: '/san-pham/chi-tiet/:masanpham',
        destination: '/:masanpham',
      },
      // Pretty category URL that keeps destination unchanged
      // Browser displays /san-pham-:slug while serving /san-pham/:slug
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
      // Optional: normalize legacy category path to pretty URL
      {
        source: '/san-pham/:slug',
        destination: '/san-pham-:slug',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
