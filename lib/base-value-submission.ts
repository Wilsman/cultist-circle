import { z } from "zod";
import { GAME_MODES } from "./game-mode";
import { MAX_HIDEOUT_SKILL, TIMERS } from "./base-value-lab";

// A test someone ran from the hidden Base Value Lab page. Shared by the
// feedback Worker (validation) and the page (building the request).

export const BASE_VALUE_SUBJECT_ID = /^[\w-]{1,120}$/;

const entrySchema = z
  .object({
    subjectId: z.string().regex(BASE_VALUE_SUBJECT_ID),
    qty: z.number().int().min(1).max(20),
  })
  .strict();

const fillerSchema = z
  .object({
    itemId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .optional(),
    name: z.string().trim().min(1).max(200),
    baseValue: z.number().int().min(0).max(10_000_000),
    qty: z.number().int().min(1).max(20),
  })
  .strict();

export const baseValueTestSchema = z
  .object({
    testId: z.string().uuid(),
    mode: z.enum(["pvp", "pve"]),
    entries: z
      .array(entrySchema)
      .min(1)
      .max(5)
      .refine(
        (entries) =>
          new Set(entries.map((e) => e.subjectId)).size === entries.length,
        "Combine copies of the same item.",
      ),
    fillers: z.array(fillerSchema).max(10),
    timer: z.enum(TIMERS),
    hideoutSkill: z.number().int().min(0).max(MAX_HIDEOUT_SKILL).optional(),
    /** Game mode the tester played in, when they said. */
    playedMode: z.enum(GAME_MODES).optional(),
    contributor: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .strict();

export type BaseValueTestSubmission = z.infer<typeof baseValueTestSchema>;
