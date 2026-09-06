import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/api/submit-feedback",
        destination: "http://127.0.0.1:8787/api/submit-feedback",
      },
    ];
  },
  // Add cache headers for the /404 page to maximize Edge caching
  async headers() {
    return [
      {
        source: "/404",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, s-maxage=31536000, stale-while-revalidate=31536000, immutable",
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
};

export default nextConfig;
