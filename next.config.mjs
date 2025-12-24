/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add cache headers for the /404 page to maximize Edge caching
  async headers() {
    return [
      {
        source: "/404",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=31536000, stale-while-revalidate=31536000, immutable",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.buymeacoffee.com",
      },
      {
        protocol: "https",
        hostname: "assets.tarkov.dev",
      },
      {
        protocol: "https",
        hostname: "pub-226fae05b0214cbeb8e3cb97c8fb6293.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.cultistcircle.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
