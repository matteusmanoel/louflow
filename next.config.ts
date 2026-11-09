import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  async headers() {
    return [
      {
        source: '/((?!tv|api/tv).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
