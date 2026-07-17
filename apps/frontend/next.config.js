/** @type {import('next').NextConfig} */
const nextConfig = {
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
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
