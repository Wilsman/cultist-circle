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
