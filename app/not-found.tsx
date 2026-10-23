import { NotFoundContent } from "@/components/not-found-content";

export const dynamic = "force-static";
export const revalidate = 86400; // Cache for 24 hours

export default function NotFound() {
  return <NotFoundContent />;
}
