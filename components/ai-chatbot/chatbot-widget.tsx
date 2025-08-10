"use client";

import { useCallback, useMemo, useState } from "react";
import { BotIcon, MessageCircleIcon, XIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import { InstructionsDialog } from "@/components/InstructionsDialog";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function getAnswer(question: string): string {
  const q = question.toLowerCase();

  // Thresholds and durations
  if (
    q.includes("6h") ||
    q.includes("6 h") ||
    q.includes("6-hour") ||
    q.includes("six hour")
  ) {
    return "6h chance requires ≥400k base value. At ≥400k: 25% 6h, 75% 14h. Going over 400k doesn't increase the chance.";
  }
  if (q.includes("14h") || q.includes("14 h") || q.includes("better loot")) {
    return "≥350k gives a chance at 14h. At 350–399k: 12h/14h mix. At ≥400k: 75% 14h (and 25% 6h).";
  }
  if (q.includes("12h") || q.includes("12 h") || q.includes("default")) {
    return "12h is the default. <350k is guaranteed 12h; 350–399k can give 12h or 14h.";
  }

  // Threshold summary
  if (
    q.includes("threshold") ||
    q.includes("thresholds") ||
    q.includes("explain thresholds")
  ) {
    return "Thresholds: <350k → 12h. 350–399k → 12h/14h. ≥400k → 25% 6h, 75% 14h. Over 400k doesn't improve 6h chance.";
  }

  // Base value calculation
  if (
    q.includes("base value") ||
    q.includes("multiplier") ||
    q.includes("vendor")
  ) {
    return "Base value = vendor sell price ÷ vendor trading multiplier (avoid Fence). Example: 126,000 ÷ 0.63 = 200,000.";
  }

  // Examples
  if (q.includes("moonshine")) {
    return "Moonshine base value: 126,000 ÷ 0.63 = 200,000. Two bottles reach 400k (6h/14h pool).";
  }
  if (q.includes("vase") || q.includes("antique")) {
    return "Antique Vase: 33,222 ÷ 0.49 ≈ 67,800. Five = ~339k (12h). 1 Moonshine + 3 Vases ≈ 403.4k (6h/14h pool).";
  }

  // Item count rule
  if (
    q.includes("how many") ||
    q.includes("how much") ||
    q.includes("items") ||
    q.includes("slots")
  ) {
    return "You can place 1–5 items in the circle. Any mix is fine as long as total base value hits your target threshold.";
  }

  // Weapon-specific behavior and example combos
  if (q.includes("weapon") || q.includes("weapons") || q.includes("gun")) {
    if (
      q.includes("investigating") ||
      (q.includes("higher") && q.includes("base"))
    ) {
      return "We're investigating why some weapons return higher base values in the circle; weapon-specific values may apply.";
    }
    return "Weapons have special circle values; vendor-base math may not apply. Durability can affect value, so totals can differ.";
  }
  if (q.includes("durability")) {
    return "Item durability can influence effective circle value, especially for weapons.";
  }
  if (q.includes("mp5sd") || q.includes("slim diary")) {
    return "Reported combo: 2× MP5SD (~$900 total from Peacekeeper) + 1× Slim Diary (~40–50k₽) can reach the 400k threshold due to weapon-specific values.";
  }
  if (q.includes("flash drive")) {
    return "Flash Drive may be a cheaper alternative to Slim Diary depending on market; try 2× MP5SD + Diary/Flash Drive.";
  }
  if (
    q.includes("5x mp5") ||
    q.includes("5 x mp5") ||
    q.includes("five mp5") ||
    (q.includes("mp5") &&
      (q.includes("level 1") ||
        q.includes("lvl 1") ||
        q.includes("peacekeeper")))
  ) {
    return "Reported combo: 5× MP5 (Peacekeeper L1) can trigger 6/14h due to special weapon circle values.";
  }
  // Generic MP5 mention
  if (q.includes("mp5")) {
    return "Reported combo: 5× MP5 (Peacekeeper L1) can trigger 6/14h due to special weapon circle values.";
  }
  if (
    q.includes("g28") ||
    q.includes("labs access") ||
    q.includes("labs card")
  ) {
    return "Reported combo: 1× G28 Patrol Rifle via barter (1 Labs Access Card, ~166k from Therapist) can trigger 6/14h due to special weapon values.";
  }

  // Features from Instructions
  if (q.includes("auto select") || q.includes("autoselect")) {
    return "Auto Select finds the most cost-effective combo to hit your target (e.g., ≥400k) automatically.";
  }
  if (q.includes("pin")) {
    return "Pin locks chosen items so Auto Select must include them in the final combination.";
  }
  if (q.includes("override")) {
    return "Override lets you set custom flea prices when market differs from API data.";
  }
  if (q.includes("share")) {
    return "Share creates a compact code to save or send your selection to others.";
  }
  if (q.includes("red price") || q.includes("unstable")) {
    return "Red price text = unstable flea price (low offer count at capture).";
  }
  if (q.includes("yellow price") || q.includes("manual")) {
    return "Yellow price text = price manually overridden by you.";
  }
  if (q.includes("exclude") || q.includes("categories")) {
    return "Exclude categories you don't want to sacrifice to narrow results.";
  }
  if (q.includes("sort")) {
    return "Sort items by most recently updated or best value for rubles.";
  }

  // PVP flea status and trader pricing
  if (
    (q.includes("pvp") && q.includes("flea")) ||
    q.includes("flea disabled") ||
    q.includes("flea off")
  ) {
    return "PVP: Flea is disabled. Use Settings → Price Mode: Trader, then set Trader Levels to calculate trader-only prices.";
  }
  if (
    q.includes("trader price") ||
    q.includes("price mode") ||
    q.includes("trader levels")
  ) {
    return "Switch Price Mode to Trader in Settings, then pick your Trader Levels (LL1–LL4) to use trader-only prices.";
  }
  if (
    q.includes("hardcore") ||
    q.includes("l1 traders") ||
    q.includes("ll1") ||
    (q.includes("level 1") && q.includes("trader"))
  ) {
    return "Hardcore PVP tip (LL1): 5× MP5 from Peacekeeper ≈ 400k+. Cost: $478 (~63,547₽) × 5 = $2,390 (~317,735₽).";
  }
  if (
    q.includes("limitation") ||
    q.includes("wip") ||
    q.includes("work in progress") ||
    q.includes("quest locked")
  ) {
    return "Trader pricing is work-in-progress: quest-locked items are currently included.";
  }
  if (q.includes("mode") || q.includes("pve") || q.includes("pvp")) {
    return "Toggle PVE/PVP to match the correct flea market for pricing/search.";
  }
  if (q.includes("tips") || q.includes("strategy") || q.includes("optimal")) {
    return "Aim slightly over 400k, use Auto Select, pin items you own, and ensure relevant quests are active for quest rewards.";
  }
  if (
    q.includes("discord") ||
    q.includes("discord server") ||
    q.includes("discord community")
  ) {
    return "Join our Discord server for support, updates, and community discussion. https://discord.com/invite/3dFmr5qaJK";
  }

  // Calculator usage
  if (
    q.includes("calculator") ||
    q.includes("how to use") ||
    q.includes("use it") ||
    q.includes("help")
  ) {
    return "Pick up to 5 items and check total base value: ≥350k for 14h chance; ≥400k for 25% 6h / 75% 14h. Base value uses vendor price ÷ multiplier.";
  }

  return "Ask about thresholds (350k/400k), 6h/12h/14h chances, base value math (vendor ÷ trader multiplier), PVE/PVP flea, item combos, Auto Select/Pin/Override/Share/Refresh, price indicators, excluding categories, sorting, tips, or Discord.";
}

function generateId(): string {
  // Prefer Web Crypto APIs when available
  if (typeof crypto !== "undefined") {
    const c = crypto as Crypto & { randomUUID?: () => string };
    try {
      if (typeof c.randomUUID === "function") return c.randomUUID();
    } catch {}
    try {
      if (typeof c.getRandomValues === "function") {
        const buf = new Uint8Array(16);
        c.getRandomValues(buf);
        buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
        buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
        const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0"));
        return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
      }
    } catch {}
  }
  // Last-resort fallback (not cryptographically strong)
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ChatbotWidget({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ChatStatus | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      content:
        "Hi! I can answer quick questions about Cultist Circle thresholds, durations, and base value math.",
    },
  ]);

  const handleToggle = useCallback(() => setIsOpen((v) => !v), []);

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const text = (fd.get("message") as string)?.trim();
      if (!text) return;

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "user", content: text },
      ]);
      setStatus("submitted");

      // Simulate quick processing then respond
      setTimeout(() => {
        const reply = getAnswer(text);
        setMessages((prev) => [
          ...prev,
          { id: generateId(), role: "assistant", content: reply },
        ]);
        setStatus(undefined);
      }, 250);

      // reset textarea
      e.currentTarget.reset();
    },
    []
  );

  const containerClasses = useMemo(
    () => cn("fixed bottom-4 right-4 z-50", className),
    [className]
  );

  return (
    <div className={containerClasses}>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "flex items-center gap-2 rounded-full border border-slate-800/50",
            "bg-slate-900/80 text-slate-100 backdrop-blur px-4 py-2 shadow-lg",
            "hover:bg-slate-900/90 transition"
          )}
          aria-label="Open AI helper"
        >
          <MessageCircleIcon className="size-4" />
          <span className="text-sm font-medium">AI Help</span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "flex h-[22rem] w-[22rem] flex-col overflow-hidden",
            "rounded-2xl border border-slate-800/50 bg-slate-900/80 backdrop-blur",
            "shadow-xl"
          )}
          role="dialog"
          aria-label="Cultist Circle assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <BotIcon className="size-4" />
              Cultist Assistant
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          {/* Quick help button using the existing Instructions dialog */}
          <div className="px-3 pb-2">
            <InstructionsDialog className="h-7 rounded-full px-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800" />
          </div>

          {/* Messages */}
          <Conversation className="min-h-0 flex-1">
            <ConversationContent>
              <div className="flex w-full flex-col">
                {messages.map((m) => (
                  <Message key={m.id} from={m.role}>
                    <MessageAvatar
                      src=""
                      name={m.role === "assistant" ? "CC" : "You"}
                    />
                    <MessageContent>{m.content}</MessageContent>
                  </Message>
                ))}
              </div>
            </ConversationContent>
          </Conversation>

          {/* Input */}
          <div className="border-t border-slate-800/50 p-2">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea placeholder="Ask a quick question…" />
              <div className="flex items-center justify-end p-1">
                <PromptInputSubmit status={status} />
              </div>
            </PromptInput>
          </div>
        </div>
      )}
    </div>
  );
}
