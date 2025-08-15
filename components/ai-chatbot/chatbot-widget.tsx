"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

/**
 * ChatbotWidget
 *
 * A compact, accessible chat widget that answers FAQs about
 * Cultist Circle thresholds, durations, and base-value math.
 *
 * Improvements vs the original:
 * - Clear, testable answer routing (rules array)
 * - Simple, dependency-free id generation (no Web Crypto)
 * - Focus management + ESC to close
 * - Auto-scroll to newest message
 * - Reduced inline logic; small utilities for readability
 * - ARIA attributes for better screen‑reader support
 */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ------------------------------
// Utilities
// ------------------------------
const normalize = (s: string) => s.toLowerCase().trim();
const includesAny = (q: string, needles: string[]) =>
  needles.some((n) => q.includes(n));

// Lightweight id generator: timestamp + sequence counter (no Web Crypto)
let __idSeq = 0;
function generateId(): string {
  __idSeq = (__idSeq + 1) % 1_000_000;
  const t = Date.now().toString(36);
  const s = __idSeq.toString(36).padStart(2, "0");
  return `m${t}-${s}`;
}

// ------------------------------
// Answer engine
// ------------------------------
const ANSWERS: Array<{ test: (q: string) => boolean; answer: string }> = [
  // Durations & thresholds
  {
    test: (q) => includesAny(q, ["6h", "6 h", "6-hour", "six hour"]),
    answer:
      "6h(quest/hideout-item) is only a 25% chance, requires ≥400k base value. At ≥400k: 25% 6h(quest/hideout-item), 75% 14h(high-value). Going over 400k doesn't increase the chance.",
  },
  {
    test: (q) => includesAny(q, ["14h", "14 h", "better loot"]),
    answer:
      "At 350–399k: 14h(high-value). At ≥400k: 75% 14h(high-value) (and 25% 6h(quest/hideout-item)).",
  },
  {
    test: (q) => includesAny(q, ["12h", "12 h", "default"]),
    answer:
      "200-350k is guaranteed 12h(normal-item). 350–399k will give 14h(high-value).",
  },
  {
    test: (q) => includesAny(q, ["threshold", "thresholds", "explain thresholds"]),
    answer:
      "Thresholds: <350k → 12h(normal-item). 350–399k → 14h(high-value). ≥400k → 25% 6h(quest/hideout-item), 75% 14h(high-value). Over 400k doesn't improve 6h chance.",
  },

  // Base value math
  {
    test: (q) => includesAny(q, ["base value", "multiplier", "vendor"]),
    answer:
      "Base value = vendor sell price ÷ vendor trading multiplier. This value is used to hit the thresholds for 6h/14h.",
  },

  // Item count rule
  {
    test: (q) => includesAny(q, ["how many", "how much", "items", "slots"]),
    answer:
      "You can place 1–5 items in the circle. Any mix is fine as long as total base value hits your target threshold.",
  },

  // Weapons & durability
  {
    test: (q) => includesAny(q, ["weapon", "weapons", "gun"]) &&
      (includesAny(q, ["investigating"]) || (q.includes("higher") && q.includes("base"))),
    answer:
      "We're investigating why some weapons return higher base values in the circle; weapon-specific values may apply.",
  },
  {
    test: (q) => includesAny(q, ["weapon", "weapons", "gun"]),
    answer:
      "Weapons have special circle values; vendor-base math may not apply. Durability can affect value, so totals can differ.",
  },
  {
    test: (q) => q.includes("durability"),
    answer: "Item durability can influence effective circle value, especially for weapons.",
  },
  {
    test: (q) => includesAny(q, ["mp5sd", "slim diary", "diary"]),
    answer:
      "Reported combo: 2× MP5SD (~$900 total from Peacekeeper) + 1× Slim Diary/Diary (~40–50k₽) can reach the 400k threshold due to weapon-specific values.",
  },
  {
    test: (q) => q.includes("flash drive"),
    answer:
      "Flash Drive may be a cheaper alternative to Slim Diary depending on market; try 2× MP5SD + Diary/Flash Drive.",
  },
  {
    test: (q) =>
      includesAny(q, ["5x mp5", "5 x mp5", "five mp5"]) ||
      (q.includes("mp5") && includesAny(q, ["level 1", "lvl 1", "peacekeeper"])),
    answer:
      "Reported combo: 5× MP5 (Peacekeeper L1) can trigger 6/14h due to special weapon circle values.",
  },
  {
    test: (q) => q.includes("mp5"),
    answer:
      "Reported combo: 5× MP5 (Peacekeeper L1) can trigger 6/14h due to special weapon circle values.",
  },
  {
    test: (q) => includesAny(q, ["g28", "labs access", "labs card"]),
    answer:
      "Reported combo: 1× G28 Patrol Rifle via barter (1 Labs Access Card, ~166k from Therapist) can trigger 6/14h due to special weapon values.",
  },

  // Support & feedback routing (high priority)
  {
    test: (q) =>
      includesAny(q, [
        "broken",
        "bug",
        "issue",
        "error",
        "problem",
        "not working",
        "crash",
        "crashing",
        "stuck",
        "feedback",
        "suggestion",
        "feature request",
        "support",
        "help",
      ]),
    answer:
      "For bugs, errors, or feedback, please join our Discord for faster help: https://discord.com/invite/3dFmr5qaJK",
  },

  // Features from Instructions
  { test: (q) => includesAny(q, ["auto select", "autoselect"]), answer: "Auto Select finds the most cost-effective combo to hit your target (e.g., ≥400k) automatically." },
  { test: (q) => q.includes("pin"), answer: "Pin locks chosen items so Auto Select must include them in the final combination." },
  { test: (q) => includesAny(q, ["override", "override price"]), answer: "Override lets you set custom flea prices when market differs from API data." },
  { test: (q) => q.includes("share"), answer: "Share creates a compact code to save or send your selection to others." },
  { test: (q) => includesAny(q, ["red price", "unstable"]), answer: "Red price text = unstable flea price (low offer count at capture)." },
  { test: (q) => includesAny(q, ["yellow price", "manual"]), answer: "Yellow price text = price manually overridden by you." },
  { test: (q) => includesAny(q, ["exclude", "categories"]), answer: "Exclude categories you don't want to sacrifice to narrow results." },
  { test: (q) => q.includes("sort"), answer: "Sort items by most recently updated or best value for rubles." },

  // PVP/PVE & trader pricing
  {
    test: (q) => includesAny(q, ["pvp flea", "flea disabled", "flea off"]) || (q.includes("pvp") && q.includes("flea")),
    answer:
      "PVP: Flea is disabled. Use Settings → Price Mode: Trader, then set Trader Levels to calculate trader-only prices.",
  },
  {
    test: (q) => includesAny(q, ["flea prices", "flea prices wrong", "flea wrong"]),
    answer:
      "Flea prices are the best and latest we can get from the API.",
  },
  {
    test: (q) => includesAny(q, ["trader price", "price mode", "trader levels"]),
    answer:
      "Switch Price Mode to Trader in Settings, then pick your Trader Levels (LL1–LL4) to use trader-only prices.",
  },
  {
    test: (q) => includesAny(q, ["hardcore", "l1 traders", "ll1"]) || (q.includes("level 1") && q.includes("trader")),
    answer:
      "Hardcore PVP tip (LL1): 5× MP5 from Peacekeeper ≈ 400k+. Cost: $478 (~63,547₽) × 5 = $2,390 (~317,735₽).",
  },
  {
    test: (q) => includesAny(q, ["limitation", "wip", "work in progress", "quest locked"]),
    answer:
      "Trader pricing is work-in-progress: quest-locked items are currently included.",
  },
  { test: (q) => includesAny(q, ["mode", "pve", "pvp"]), answer: "Toggle PVE/PVP to match the correct flea market for pricing/search." },
  { test: (q) => includesAny(q, ["tips", "strategy", "optimal"]), answer: "Aim slightly over 400k, use Auto Select, pin items you own, and ensure relevant quests are active for quest rewards." },
  {
    test: (q) => includesAny(q, ["discord", "discord server", "discord community"]),
    answer: "Join our Discord server for support, updates, and community discussion. https://discord.com/invite/3dFmr5qaJK",
  },

  // Calculator usage
  {
    test: (q) => includesAny(q, ["calculator", "how to use", "use it", "help"]),
    answer:
      "Pick up to 5 items and check total base value: ≥350k for 14h(high-value) chance; ≥400k for 25% 6h(quest/hideout-item) / 75% 14h(high-value).",
  },
];

function getAnswer(question: string): string {
  const q = normalize(question);
  const rule = ANSWERS.find(({ test }) => test(q));
  if (rule) return rule.answer;
  return (
    "Ask about thresholds (350k/400k), 6h/12h/14h chances, base value math (vendor ÷ trader multiplier), PVE/PVP flea, Auto Select/Pin/Override/Share/Refresh, price indicators, excluding categories, sorting, tips, or Discord."
  );
}

// ------------------------------
// Component
// ------------------------------
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = useCallback(() => setIsOpen((v) => !v), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  // Programmatic ask used by Suggestions
  const submitQuestion = useCallback((text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", content: q },
    ]);
    setStatus("submitted");

    window.setTimeout(() => {
      const reply = getAnswer(q);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "assistant", content: reply },
      ]);
      setStatus(undefined);
    }, 200);
  }, []);

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const text = (fd.get("message") as string | null)?.trim();
      if (!text) return;

      submitQuestion(text);

      // reset textarea
      e.currentTarget.reset();
    },
    [submitQuestion]
  );

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Move focus into dialog when opened
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

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
            "hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-slate-400/60"
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
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-[36rem] w-[22rem] flex-col overflow-hidden",
            "rounded-2xl border border-slate-800/50 bg-slate-900/80 backdrop-blur",
            "shadow-xl outline-none"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Cultist Circle assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <BotIcon className="size-4" />
              <span> Cultist Assistant</span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
              aria-label="Close"
              title="Close"
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
              <div
                className="flex w-full flex-col"
                aria-live="polite"
                aria-relevant="additions"
              >
                {messages.map((m) => (
                  <Message key={m.id} from={m.role}>
                    <MessageAvatar
                      src=""
                      name={m.role === "assistant" ? "CC" : "You"}
                    />
                    <MessageContent>{m.content}</MessageContent>
                  </Message>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ConversationContent>
          </Conversation>

          {/* Input */}
          <div className="border-t border-slate-800/50 p-2">
            <PromptInput onSubmit={handleSubmit}>
              <div className="relative">
                <PromptInputTextarea placeholder="Ask a quick question…" className="pr-12" />
                <PromptInputSubmit
                  status={status}
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
                />
              </div>
            </PromptInput>
          </div>

          {/* Suggestions under input */}
          <div className="px-3 pb-3">
            <Suggestions className="gap-1.5">
              <Suggestion suggestion="What is base value?" onClick={submitQuestion} />
              <Suggestion suggestion="Thresholds?" onClick={submitQuestion} />
              <Suggestion suggestion="14h" onClick={submitQuestion} />
              <Suggestion suggestion="6h" onClick={submitQuestion} />
              <Suggestion suggestion="autoselect" onClick={submitQuestion} />
            </Suggestions>
          </div>
        </div>
      )}
    </div>
  );
}
