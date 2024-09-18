// components/SkeletonSelect.tsx

import React from "react";

export default function SkeletonSelect() {
  return (
    <div
      className="w-full bg-gray-700 h-10 rounded animate-pulse"
      aria-hidden="true"
    ></div>
  );
}
