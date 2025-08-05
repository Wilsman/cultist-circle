/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.buymeacoffee.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.tarkov.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-226fae05b0214cbeb8e3cb97c8fb6293.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.cultistcircle.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
