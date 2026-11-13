import AdBanner from "@/components/ad-banner";
import { cn } from "@/lib/utils";

const RAIL_SLOTS = { left: "8054114711", right: "5427951374" } as const;
const RAIL_AD_SIZE = { width: 160, height: 600 };

type AdRailProps = {
  side: keyof typeof RAIL_SLOTS;
  /** Breakpoint class that shows the rail, e.g. "xl:flex". Hidden below it. */
  showFrom: string;
};

/**
 * A sticky 160x600 ad that fills the gutter beside the content and sits
 * centred between the content and the window edge. It never overlaps content.
 */
export function AdRail({ side, showFrom }: AdRailProps) {
  return (
    <aside
      className={cn(
        "hidden min-w-[160px] flex-1 justify-center self-stretch",
        showFrom,
      )}
    >
      <div className="sticky top-4 h-[600px] w-[160px]">
        <AdBanner dataAdSlot={RAIL_SLOTS[side]} size={RAIL_AD_SIZE} />
      </div>
    </aside>
  );
}
