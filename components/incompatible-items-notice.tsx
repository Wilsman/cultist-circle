"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function IncompatibleItemsNotice() {
  return (
    <Link 
      href="/incompatible-items"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-full hover:bg-yellow-500/15 transition-colors group"
    >
      <AlertTriangle className="h-3 w-3 text-yellow-500" />
      <span className="text-yellow-200 group-hover:text-yellow-100 transition-colors">
        Incompatible items
      </span>
      <ExternalLink className="h-2.5 w-2.5 text-yellow-400 opacity-60 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
