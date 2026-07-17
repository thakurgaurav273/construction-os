import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sitepilot/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@sitepilot/ui', 'lucide-react', 'recharts'],
  },
};

export default nextConfig;
