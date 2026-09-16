import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RecipeFeedback,
  RecipeFeedbackProvider,
} from "@/components/recipe-feedback.component";
import { useRecipeFeedbackStore } from "@/hooks/use-recipe-feedback";
import {
  RECIPE_USER_MODES_STORAGE_KEY,
  RECIPE_USER_VOTES_STORAGE_KEY,
} from "@/lib/recipe-feedback";

const TEST_MODES = {
  pvp: { worked: 7, didntWork: 1 },
  pve: { worked: 2, didntWork: 0 },
  season: { worked: 0, didntWork: 0 },
};
const testRecipeId = "recipe-test-verification";

function renderFeedback(modeRestriction?: "pvp-only") {
  return render(
    <RecipeFeedbackProvider>
      <RecipeFeedback
        recipeId={testRecipeId}
        modeRestriction={modeRestriction}
      />
    </RecipeFeedbackProvider>,
  );
}

describe("RecipeFeedback component", () => {
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
                lastWorkedAt: new Date().toISOString(),
                lastWorkedMode: "pve",
                modes: TEST_MODES,
              },
            },
          });
        }
        const body = JSON.parse(String(init.body)) as {
          vote: "worked" | "didnt_work" | null;
          gameMode: "pvp" | "pve" | "season" | null;
        };
        return Response.json({
          success: true,
          data: {
            recipeId: testRecipeId,
            stats: {
              workedCount: body.vote === "worked" ? 11 : 10,
              didntWorkCount: body.vote === "didnt_work" ? 3 : 2,
              lastWorkedAt: new Date().toISOString(),
              lastWorkedMode: body.vote === "worked" ? body.gameMode : "pve",
              modes: TEST_MODES,
            },
            userVote: body.vote,
            userMode: body.vote ? body.gameMode : null,
          },
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("asks for a mode after clicking Worked, then casts the report", async () => {
    renderFeedback();
    const worked = await screen.findByRole("button", {
      name: /mark as worked \(currently 10\)/i,
    });
    fireEvent.click(worked);
    const modeGroup = screen.getByRole("radiogroup", {
      name: /game mode for worked report/i,
    });
    fireEvent.click(within(modeGroup).getByRole("radio", { name: "PVP" }));
    await waitFor(() => expect(worked).toHaveAttribute("aria-pressed", "true"));
    const post = vi
      .mocked(fetch)
      .mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      recipeId: testRecipeId,
      vote: "worked",
      gameMode: "pvp",
    });
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("removes the active vote only when vote and selected mode match", async () => {
    localStorage.setItem(
      RECIPE_USER_VOTES_STORAGE_KEY,
      JSON.stringify({ [testRecipeId]: "worked" }),
    );
    localStorage.setItem(
      RECIPE_USER_MODES_STORAGE_KEY,
      JSON.stringify({ [testRecipeId]: "pvp" }),
    );
    renderFeedback();
    const worked = await screen.findByRole("button", {
      name: /mark as worked/i,
    });
    expect(worked).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(worked);
    fireEvent.click(
      screen.getByRole("button", { name: /remove my pvp report/i }),
    );
    await waitFor(() => {
      const post = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        vote: null,
        gameMode: null,
      });
    });
  });

  it("moves an existing same-direction report to the selected mode", async () => {
    localStorage.setItem(
      RECIPE_USER_VOTES_STORAGE_KEY,
      JSON.stringify({ [testRecipeId]: "worked" }),
    );
    localStorage.setItem(
      RECIPE_USER_MODES_STORAGE_KEY,
      JSON.stringify({ [testRecipeId]: "pvp" }),
    );
    renderFeedback();
    const worked = await screen.findByRole("button", {
      name: /mark as worked/i,
    });
    expect(worked).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(worked);
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", {
          name: /game mode for worked report/i,
        }),
      ).getByRole("radio", { name: "PVE" }),
    );
    await waitFor(() => {
      const post = vi
        .mocked(fetch)
        .mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        vote: "worked",
        gameMode: "pve",
      });
    });
  });

  it("opens a keyboard and touch accessible mode breakdown including legacy totals", async () => {
    renderFeedback();
    const details = await screen.findByRole("button", {
      name: /view community report details/i,
    });
    fireEvent.click(details);
    const popover = await screen.findByText("Community reports");
    const content = within(
      (popover.parentElement?.parentElement ?? popover.parentElement) as HTMLElement,
    );
    expect(content.getByText("PVP")).toBeInTheDocument();
    expect(content.getByText("PVE")).toBeInTheDocument();
    expect(content.getByText("PVP-S")).toBeInTheDocument();
    expect(content.getByText("Unspecified")).toBeInTheDocument();
  });

  it("shows per-mode recency and highlights the latest report", async () => {
    vi.mocked(fetch).mockReset();
    const now = Date.now();
    const minutesAgo = (m: number, extraSecs = 30) =>
      new Date(now - (m * 60 + extraSecs) * 1000).toISOString();
    const hoursAgo = (h: number, extraMins = 5) =>
      new Date(now - (h * 3600 + extraMins * 60) * 1000).toISOString();
    const daysAgo = (d: number, extraHours = 1) =>
      new Date(now - (d * 24 * 3600 + extraHours * 3600) * 1000).toISOString();
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        success: true,
        data: {
          [testRecipeId]: {
            workedCount: 3,
            didntWorkCount: 15,
            lastWorkedAt: minutesAgo(47),
            lastWorkedMode: "pve",
            lastDidntWorkAt: minutesAgo(5),
            lastDidntWorkMode: "pve",
            modes: {
              pvp: {
                worked: 1,
                didntWork: 1,
                lastWorkedAt: hoursAgo(2),
                lastDidntWorkAt: hoursAgo(26),
              },
              pve: {
                worked: 1,
                didntWork: 7,
                lastWorkedAt: minutesAgo(47),
                lastDidntWorkAt: minutesAgo(5),
              },
              season: {
                worked: 1,
                didntWork: 7,
                lastWorkedAt: daysAgo(3),
                lastDidntWorkAt: daysAgo(4),
              },
            },
          },
        },
      }),
    );
    renderFeedback();
    fireEvent.click(
      await screen.findByRole("button", {
        name: /view community report details/i,
      }),
    );
    const popover = await screen.findByText("Community reports");
    const content = within(
      (popover.parentElement?.parentElement ?? popover.parentElement) as HTMLElement,
    );
    expect(content.getByText("Worked 2h ago")).toBeInTheDocument();
    expect(content.getByText("Worked 47m ago")).toBeInTheDocument();
    expect(content.getByText("Failed 5m ago")).toBeInTheDocument();
    expect(content.getByText("Latest")).toBeInTheDocument();
    expect(
      content.getByText(/Latest: Didn't work on PVE/),
    ).toBeInTheDocument();
  });

  it("disables reporting after initial load failure and offers Retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ success: true, data: {} }));
    renderFeedback();
    const retry = await screen.findByRole("button", { name: /retry/i });
    expect(
      screen.getByRole("button", { name: /mark as worked/i }),
    ).toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /mark as worked/i }),
      ).toBeEnabled(),
    );
  });

  it("shows the API cooldown when a report is rate limited", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(fetch).mockImplementationOnce(async () =>
      Response.json({ success: true, data: {} }),
    );
    vi.mocked(fetch).mockImplementationOnce(async () =>
      Response.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );
    renderFeedback();
    fireEvent.click(
      await screen.findByRole("button", { name: /mark as worked/i }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "PVP" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Too many reports. Try again in 60s.",
    );
  });

  it("offers only PVP for a PVP-only recipe", async () => {
    renderFeedback("pvp-only");
    fireEvent.click(
      await screen.findByRole("button", { name: /mark as worked/i }),
    );
    expect(screen.getByRole("radio", { name: "PVP" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "PVE" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "PVP-S" })).toBeDisabled();
    expect(screen.getByText(/only be reported for PVP/i)).toBeInTheDocument();
  });

  it("uses larger touch targets on narrow screens and announces success", async () => {
    renderFeedback();
    const worked = await screen.findByRole("button", {
      name: /mark as worked/i,
    });
    expect(worked).toHaveClass("h-10");
    fireEvent.click(worked);
    fireEvent.click(screen.getByRole("radio", { name: "PVP" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Report saved.",
    );
  });

  it("shows didnt-work recency instead of no reports for didnt-work-only recipes", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        success: true,
        data: {
          [testRecipeId]: {
            workedCount: 0,
            didntWorkCount: 2,
            lastWorkedAt: null,
            lastWorkedMode: null,
            lastDidntWorkAt: new Date(
              Date.now() - (3 * 24 * 3600 * 1000 + 3600 * 1000),
            ).toISOString(),
            modes: {
              pvp: { worked: 0, didntWork: 1 },
              pve: { worked: 0, didntWork: 1 },
              season: { worked: 0, didntWork: 0 },
            },
          },
        },
      }),
    );
    renderFeedback();
    expect(await screen.findByText("Didn't work 3d ago")).toBeInTheDocument();
    expect(screen.queryByText("No reports yet")).not.toBeInTheDocument();
  });

  it("shows the latest worked mode beneath the confirmation time", async () => {
    renderFeedback();
    expect(
      await screen.findByText("Last worked on PVE · just now"),
    ).toBeInTheDocument();
  });
});
