/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: process.env.NEXT_PUBLIC_GIT_COMMIT || 
      require('child_process')
        .execSync('git log -1 --pretty=%B')
        .toString()
        .trim(),
  },
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
    ],
  },
};

export default nextConfig;
