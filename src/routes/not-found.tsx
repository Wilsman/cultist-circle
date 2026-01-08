import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl text-gray-100 mb-8">Page Not Found</h2>
      <Link
        to="/"
        className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
