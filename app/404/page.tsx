import { NotFoundContent } from "@/components/not-found-content";

// Force static generation - this page will be pre-rendered at build time
export const dynamic = "force-static";
export const revalidate = false; // Never revalidate - fully static

// Add aggressive cache headers
export async function generateMetadata() {
  return {
    title: "404 - Page Not Found",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function NotFoundPage() {
  return <NotFoundContent />;
}
