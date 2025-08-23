"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cc_onboarding_seen_v1";

interface SlideProps {
  title: string;
  children: React.ReactNode;
}

function Slide({ title, children }: SlideProps) {
  return (
    <div className="space-y-3 p-2 max-w-full sm:max-w-[680px] md:max-w-[720px] mx-auto min-w-0">
      <h3 className="text-lg font-semibold text-yellow-500">{title}</h3>
      <div className="rounded-lg border border-border/50 bg-background/50 p-3 sm:p-3 overflow-hidden">
        <div className="text-sm leading-relaxed text-muted-foreground space-y-2 break-words">
          {children}
        </div>
      </div>
    </div>
  );
}

export function OnboardingDialog() {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const carouselApi = React.useRef<CarouselApi | null>(null);

  React.useEffect(() => {
    // Only show once per browser using localStorage flag
    try {
      const seen =
        typeof window !== "undefined" &&
        window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  function handleClose() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogContent className="mx-2 w-full max-w-[92vw] sm:max-w-[800px] md:max-w-[900px] max-h-[68vh] sm:max-h-[75vh] overflow-x-hidden overflow-y-auto rounded-2xl border bg-background/50 backdrop-blur p-2 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-center pr-24 sm:pr-12 text-base sm:text-lg truncate">
            Welcome to Cultist Circle
          </DialogTitle>
        </DialogHeader>

        <div className="relative px-3 sm:px-8 overscroll-contain pb-16 min-w-0">
          <Carousel
            className="w-full"
            opts={{ align: "start", loop: false }}
            setApi={(api) => {
              carouselApi.current = api;
              api?.on("select", () => setIndex(api.selectedScrollSnap()));
            }}
          >
            <CarouselContent>
              <CarouselItem>
                <Slide title="What is the Cultist Circle?">
                  <p>
                    Sacrifice up to 5 items—their base values (₽) are summed,
                    and that total determines your reward tier.
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      ≥ ₽350,001: increased chance for higher‑value loot; ritual
                      is 14h.
                    </li>
                    <li>
                      ≥ ₽400,000: 25% chance for quest/Hideout items; if
                      triggered it&#39;s 6h, otherwise 14h.
                    </li>
                    <li>
                      Placing a Sacred Amulet boosts the total by 15% (consumes
                      1 use).
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Note: base value = vendor sell price ÷ that vendor’s
                    multiplier.
                  </p>
                </Slide>
              </CarouselItem>

              <CarouselItem>
                <Slide title="Why use this calculator?">
                  <p>
                    Find the cheapest way to hit your target base value—fast.
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Auto‑select suggests optimal 1–5 item combos from live
                      prices.
                    </li>
                    <li>Minimize cost while meeting 350k/400k thresholds.</li>
                    <li>Full list of items in Tools &gt; Base Value Table.</li>
                    <li>
                      Pin items you own; exclude categories or specific items.
                    </li>
                    <li>Share your selection or start the ritual.</li>
                  </ul>
                </Slide>
              </CarouselItem>

              <CarouselItem>
                <Slide title="How to use the calculator">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Set game mode (PVE/PVP).</li>
                    <li>Set your threshold (e.g., 400k).</li>
                    <li>Search/select up to 5 items, or use Auto Select.</li>
                    <li>
                      Pin items you already own; override prices if needed.
                    </li>
                    <li>Put items in the circle and start the ritual.</li>
                    <li>Sacrifice the items.</li>
                  </ol>
                </Slide>
              </CarouselItem>

              <CarouselItem>
                <Slide title="Settings overview">
                  <p>Customize how calculations work and manage your data:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Sort options: A–Z, by base value, by update recency, best
                      value
                    </li>
                    <li>Price mode: Flea or Trader</li>
                    <li>Flea price basis: Last Low Price or 24h Average</li>
                    <li>Exclude low-offer-count items from Flea Market</li>
                    <li>
                      Exclude categories or individual items from suggestions
                    </li>
                    <li>Clear all stored data (reset)</li>
                  </ul>
                </Slide>
              </CarouselItem>

              <CarouselItem>
                <Slide title="Thresholds and outcomes">
                  <div className="overflow-x-auto max-h-52 sm:max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <th className="text-left py-2.5 px-4 font-semibold">
                            Range (Base Value)
                          </th>
                          <th className="text-left py-2.5 px-4 font-semibold">
                            Time
                          </th>
                          <th className="text-left py-2.5 px-4 font-semibold">
                            Results
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          interface Row {
                            range: string;
                            time: string;
                            result: string;
                          }
                          const data: Row[] = [
                            {
                              range: "0 - 10,000",
                              time: "2 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "10,001 - 25,000",
                              time: "3 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "25,001 - 50,000",
                              time: "4 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "50,001 - 100,000",
                              time: "5 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "100,001 - 200,000",
                              time: "8 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "200,001 - 350,000",
                              time: "12 hours",
                              result: "Normal value item",
                            },
                            {
                              range: "≥ 350,001",
                              time: "14 hours",
                              result: "High value item",
                            },
                            {
                              range: "≥ 400,000",
                              time: "14 or 6 hours",
                              result:
                                "14h(high-value) or 25% chance for 6h (Quest/Hideout)",
                            },
                          ];
                          return [...data].reverse().map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-border/30 hover:bg-muted/10 transition-colors duration-200"
                            >
                              <td className="py-2.5 px-4 font-medium">
                                {row.range}
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground">
                                {row.time}
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={cn(
                                    // Mobile: plain text only
                                    "text-xs font-medium",
                                    row.result.includes("High value") || row.result.includes("14h")
                                      ? "text-amber-400 sm:bg-amber-500/20 sm:border-amber-500/30"
                                      : "text-blue-400 sm:bg-blue-500/20 sm:border-blue-500/30",
                                    // Desktop: show bubble
                                    "sm:inline-flex sm:items-center sm:px-2.5 sm:py-1 sm:rounded-full sm:border"
                                  )}
                                >
                                  {row.result}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </Slide>
              </CarouselItem>

              {/* <CarouselItem>
                <Slide title="What's next?">
                  <p>
                    We're working on more features to help you optimize your
                    rituals.
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Item filtering and sorting</li>
                    <li>Hideout item tracking</li>
                    <li>Quest item tracking</li>
                    <li>More...</li>
                  </ul>
                </Slide>
              </CarouselItem> */}
            </CarouselContent>

            <CarouselPrevious className="left-2 sm:-left-3 scale-90 sm:scale-100" />
            <CarouselNext className="right-2 sm:-right-3 scale-90 sm:scale-100" />
          </Carousel>

          <div className="sticky bottom-0 left-0 right-0 z-10 mt-3 flex items-center justify-between border-border/50 px-1 py-2">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors",
                    i === index ? "bg-yellow-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {index < 4 ? (
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={handleClose}
                >
                  Skip
                </Button>
              ) : null}
              {index < 4 ? (
                <Button
                  className="rounded-full"
                  onClick={() => {
                    if (carouselApi.current) {
                      carouselApi.current.scrollNext();
                      return;
                    }
                    // Fallback: click the Next control if API missing
                    const root = document.querySelector('[aria-roledescription="carousel"]');
                    (root?.querySelector('button[aria-label="Next slide"]') as HTMLButtonElement | null)?.click();
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button className="rounded-full" onClick={handleClose}>
                  Get started
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
