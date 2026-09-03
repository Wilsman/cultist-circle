import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeFeedback } from "@/components/recipe-feedback.component";
import { useRecipeFeedbackStore } from "@/hooks/use-recipe-feedback";
import { RECIPE_USER_VOTES_STORAGE_KEY } from "@/lib/recipe-feedback";

describe("RecipeFeedback component", () => {
  const testRecipeId = "recipe-test-verification";

  beforeEach(() => {
    localStorage.clear();
    useRecipeFeedbackStore.getState().resetForTesting();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (!init?.method || init.method === "GET") {
          return Response.json({
            success: true,
            data: {
              [testRecipeId]: {
                workedCount: 10,
                didntWorkCount: 2,
                lastWorkedAt: "2026-09-03T10:00:00.000Z",
              },
            },
          });
        }

        const body = JSON.parse(String(init.body)) as {
          vote: "worked" | "didnt_work" | null;
        };
        return Response.json({
          success: true,
          data: {
            recipeId: testRecipeId,
            stats: {
              workedCount: body.vote === "worked" ? 11 : 10,
              didntWorkCount: body.vote === "didnt_work" ? 3 : 2,
              lastWorkedAt:
                body.vote === "worked"
                  ? new Date().toISOString()
                  : "2026-09-03T10:00:00.000Z",
            },
            userVote: body.vote,
          },
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders Worked and Didn't work buttons with live counts", async () => {
    render(<RecipeFeedback recipeId={testRecipeId} />);

    const workedButton = screen.getByRole("button", {
      name: /mark as worked/i,
    });
    const didntWorkButton = screen.getByRole("button", {
      name: /mark as didn't work/i,
    });

    expect(workedButton).toBeInTheDocument();
    expect(workedButton).toHaveAttribute("aria-pressed", "false");

    expect(didntWorkButton).toBeInTheDocument();
    expect(didntWorkButton).toHaveAttribute("aria-pressed", "false");
    await screen.findByText("10");
  });

  it("increments worked count and marks button as pressed when clicking Worked", async () => {
    render(<RecipeFeedback recipeId={testRecipeId} />);

    await screen.findByText("10");

    const workedButton = screen.getByRole("button", {
      name: /mark as worked/i,
    });

    fireEvent.click(workedButton);

    expect(workedButton).toHaveAttribute("aria-pressed", "true");
    await screen.findByRole("button", {
      name: /mark as worked \(currently 11\)/i,
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Worked just now")).toBeInTheDocument();

    const storedVotes = JSON.parse(
      localStorage.getItem(RECIPE_USER_VOTES_STORAGE_KEY) ?? "{}",
    );
    expect(storedVotes[testRecipeId]).toBe("worked");
  });

  it("toggles and removes vote when clicking Worked again", async () => {
    render(<RecipeFeedback recipeId={testRecipeId} />);

    await screen.findByText("10");

    const workedButton = screen.getByRole("button", {
      name: /mark as worked/i,
    });
    // Vote worked
    fireEvent.click(workedButton);
    await screen.findByRole("button", {
      name: /mark as worked \(currently 11\)/i,
    });

    // Click again to unvote
    fireEvent.click(workedButton);
    expect(workedButton).toHaveAttribute("aria-pressed", "false");
    await screen.findByRole("button", {
      name: /mark as worked \(currently 10\)/i,
    });

    const storedVotes = JSON.parse(
      localStorage.getItem(RECIPE_USER_VOTES_STORAGE_KEY) ?? "{}",
    );
    expect(storedVotes[testRecipeId]).toBeUndefined();
  });

  it("switches vote from worked to didn't work", async () => {
    render(<RecipeFeedback recipeId={testRecipeId} />);

    await screen.findByText("10");

    const workedButton = screen.getByRole("button", {
      name: /mark as worked/i,
    });
    const didntWorkButton = screen.getByRole("button", {
      name: /mark as didn't work/i,
    });

    // Vote worked first
    fireEvent.click(workedButton);
    await screen.findByRole("button", {
      name: /mark as worked \(currently 11\)/i,
    });
    expect(didntWorkButton).toHaveAttribute("aria-pressed", "false");

    // Now switch to didn't work
    fireEvent.click(didntWorkButton);
    expect(workedButton).toHaveAttribute("aria-pressed", "false");
    expect(didntWorkButton).toHaveAttribute("aria-pressed", "true");

    await screen.findByRole("button", {
      name: /mark as worked \(currently 10\)/i,
    });
    await screen.findByRole("button", {
      name: /mark as didn't work \(currently 3\)/i,
    });

    const storedVotes = JSON.parse(
      localStorage.getItem(RECIPE_USER_VOTES_STORAGE_KEY) ?? "{}",
    );
    expect(storedVotes[testRecipeId]).toBe("didnt_work");
  });

  it("loads existing user vote from localStorage on mount", async () => {
    localStorage.setItem(
      RECIPE_USER_VOTES_STORAGE_KEY,
      JSON.stringify({ [testRecipeId]: "worked" }),
    );
    useRecipeFeedbackStore.getState().hydrateClientState();

    render(<RecipeFeedback recipeId={testRecipeId} />);

    const workedButton = screen.getByRole("button", {
      name: /mark as worked/i,
    });
    await screen.findByText("10");
    expect(workedButton).toHaveAttribute("aria-pressed", "true");
  });
});
