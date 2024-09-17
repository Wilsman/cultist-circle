/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.buymeacoffee.com",
      },
      {
        protocol: "https",
        hostname: "api.tarkov-market.app",
      },
    ],
  },
};

export default nextConfig;
