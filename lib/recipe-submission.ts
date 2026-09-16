import { z } from "zod";

export const SPECIAL_RECIPE_TIMERS = [
  { seconds: 360, label: "6 minutes" },
  { seconds: 3960, label: "66 minutes" },
  { seconds: 39960, label: "666 minutes" },
] as const;

const itemSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/i),
    name: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(999),
  })
  .strict();

const itemsSchema = z
  .array(itemSchema)
  .min(1)
  .max(5)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Combine quantities of the same item.",
  );

export const recipeSubmissionSchema = z
  .object({
    submissionId: z.string().uuid(),
    gameMode: z.enum(["pvp", "pve", "season"]),
    timerSeconds: z
      .number()
      .int()
      .min(1)
      .max(359999)
      .refine(
        (seconds) =>
          ![7200, 10800, 14400, 18000, 21600, 28800, 43200, 50400].includes(
            seconds,
          ),
        "Regular sacrifice timers are not special recipes.",
      ),
    sacrifices: itemsSchema.refine(
      (items) => items.reduce((total, item) => total + item.quantity, 0) <= 5,
      "You can sacrifice up to 5 items.",
    ),
    rewards: itemsSchema,
  })
  .strict();

export type RecipeSubmission = z.infer<typeof recipeSubmissionSchema>;
export type RecipeSubmissionItem = RecipeSubmission["sacrifices"][number];
