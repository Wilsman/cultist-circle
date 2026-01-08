
import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function IncompatibleItemsNotice() {
  return (
    <Link
      to="/faq"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 transition-colors group"
    >
      <AlertTriangle className="h-3 w-3" />
      <span className="group-hover:text-amber-200 transition-colors">
        Help & FAQ
      </span>
      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
