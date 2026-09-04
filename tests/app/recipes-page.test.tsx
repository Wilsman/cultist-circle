import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RECIPE_COMPLETION_STORAGE_KEY } from "@/lib/recipe-completion";
import { useRecipeFeedbackStore } from "@/hooks/use-recipe-feedback";
import RecipesPage from "@/app/recipes/page";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const mockRecipes = vi.hoisted(() => [
  {
    id: "recipe-promo",
    requiredItems: ["5x BD dogtag •| Ferrum"],
    craftingTime: "5:55:55",
    producedItems: ["1x Briefcase with documents"],
    isNew: true,
    specialFlow: {
      type: "launcher-promo" as const,
      codes: [
        "6NU9-UFK1-W2TX-89RW-M96B",
        "6NU9-W2TX-UFK1-89RW-M96B",
        "UFK1-6NU9-W2TX-89RW-M96B",
        "UFK1-W2TX-6NU9-89RW-M96B",
        "W2TX-UFK1-6NU9-89RW-M96B",
      ],
      sacrificeItemUrl: "https://tarkov.dev/item/bd-dogtag-ferrum",
      rewardItemUrl: "https://tarkov.dev/item/briefcase-with-documents",
    },
  },
  {
    id: "recipe-alpha",
    requiredItems: ["1x Alpha sacrifice"],
    craftingTime: "66 mins",
    producedItems: ["1x Moon reward"],
  },
  {
    id: "recipe-bravo",
    requiredItems: ["1x Bravo sacrifice"],
    craftingTime: "666 mins",
    producedItems: ["1x Sun reward"],
  },
]);
const getItemByNameMock = vi.hoisted(() =>
  vi.fn((_name: string): SimplifiedItem | null => null),
);
const useRecipeItemDataMock = vi.hoisted(() =>
  vi.fn((_mode: string) => ({ getItemByName: getItemByNameMock })),
);
const clipboardWriteTextMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/recipes", () => ({
  tarkovRecipes: mockRecipes,
}));

vi.mock("@/hooks/use-recipe-item-data", () => ({
  useRecipeItemData: (mode: string) => useRecipeItemDataMock(mode),
}));

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe("RecipesPage completion tracker", () => {
  const highlightedState = (id: string) =>
    document
      .getElementById(id)
      ?.querySelector("[data-highlighted]")
      ?.getAttribute("data-highlighted") ?? null;

  beforeEach(() => {
    localStorage.clear();
    useRecipeFeedbackStore.getState().resetForTesting();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (!init?.method || init.method === "GET") {
          return Response.json({
            success: true,
            data: Object.fromEntries(
              mockRecipes.map((recipe) => [
                recipe.id,
                {
                  workedCount: 10,
                  didntWorkCount: 2,
                  lastWorkedAt: "2026-09-03T10:00:00.000Z",
                },
              ]),
            ),
          });
        }

        const body = JSON.parse(String(init.body)) as {
          recipeId: string;
          vote: "worked" | "didnt_work" | null;
          gameMode: "pvp" | "pve" | "season" | null;
        };
        return Response.json({
          success: true,
          data: {
            recipeId: body.recipeId,
            stats: {
              workedCount: body.vote === "worked" ? 11 : 10,
              didntWorkCount: body.vote === "didnt_work" ? 3 : 2,
              lastWorkedAt: new Date().toISOString(),
            },
            userVote: body.vote,
            userMode: body.vote ? body.gameMode : null,
          },
        });
      }),
    );
    useRecipeItemDataMock.mockClear();
    getItemByNameMock.mockReset();
    getItemByNameMock.mockReturnValue(null);
    clipboardWriteTextMock.mockReset();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses the persisted Season item dataset", () => {
    localStorage.setItem("gameMode", "season");

    render(<RecipesPage />);

    expect(useRecipeItemDataMock).toHaveBeenCalledWith("season");
  });

  it("checks recipes independently and restores progress after remount", () => {
    render(<RecipesPage />);

    const alphaCheckbox = screen.getByRole("checkbox", {
      name: /alpha sacrifice as completed/i,
    });
    const bravoCheckbox = screen.getByRole("checkbox", {
      name: /bravo sacrifice as completed/i,
    });

    expect(alphaCheckbox).toHaveAttribute("data-state", "unchecked");
    expect(bravoCheckbox).toHaveAttribute("data-state", "unchecked");

    fireEvent.click(alphaCheckbox);

    expect(alphaCheckbox).toHaveAttribute("data-state", "checked");
    expect(bravoCheckbox).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByText("1 / 3 done")).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(RECIPE_COMPLETION_STORAGE_KEY) ?? "[]"),
    ).toEqual(["recipe-alpha"]);

    cleanup();
    render(<RecipesPage />);

    expect(
      screen.getByRole("checkbox", {
        name: /alpha sacrifice as not completed/i,
      }),
    ).toHaveAttribute("data-state", "checked");
  });

  it("keeps completion while searching and sorting", async () => {
    render(<RecipesPage />);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /alpha sacrifice as completed/i,
      }),
    );

    fireEvent.change(
      screen.getByPlaceholderText("Search items or recipes..."),
      { target: { value: "Sun reward" } },
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("checkbox", {
          name: /alpha sacrifice/i,
        }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText("Search items or recipes..."),
      { target: { value: "" } },
    );

    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", {
          name: /alpha sacrifice as not completed/i,
        }),
      ).toHaveAttribute("data-state", "checked");
    });

    fireEvent.click(screen.getByRole("button", { name: "Slowest First" }));

    expect(
      screen.getByRole("checkbox", {
        name: /alpha sacrifice as not completed/i,
      }),
    ).toHaveAttribute("data-state", "checked");
  });

  it("shows unfinished recipes only and confirms before resetting progress", () => {
    render(<RecipesPage />);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /alpha sacrifice as completed/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Unfinished only", exact: true }),
    );

    expect(
      screen.queryByRole("checkbox", {
        name: /alpha sacrifice/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: /bravo sacrifice as completed/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Reset progress", exact: true }),
    );

    const resetDialog = screen.getByRole("alertdialog");
    expect(
      within(resetDialog).getByText(/mark all 3 recipes as unfinished/i),
    ).toBeInTheDocument();

    fireEvent.click(
      within(resetDialog).getByRole("button", {
        name: "Reset progress",
        exact: true,
      }),
    );

    expect(screen.getByText("0 / 3 done")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(
      JSON.parse(localStorage.getItem(RECIPE_COMPLETION_STORAGE_KEY) ?? "[]"),
    ).toEqual([]);
  });

  it("ignores malformed and obsolete saved completion data", () => {
    localStorage.setItem(
      RECIPE_COMPLETION_STORAGE_KEY,
      JSON.stringify(["recipe-missing"]),
    );

    render(<RecipesPage />);

    expect(screen.getByText("0 / 3 done")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("renders the launcher flow with exact codes, links, and supplied images", () => {
    render(<RecipesPage />);

    expect(screen.getByText("Step 1 · Launcher unlock")).toBeInTheDocument();
    expect(
      screen.getByText(/each code delivers one Ferrum dogtag/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /copy promo code/i }),
    ).toHaveLength(5);
    expect(screen.getByText("5:55:55")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "View 5x BD dogtag •| Ferrum on Tarkov.dev",
      }),
    ).toHaveAttribute("href", "https://tarkov.dev/item/bd-dogtag-ferrum");
    expect(
      screen.getByRole("link", {
        name: "View 1x Briefcase with documents on Tarkov.dev",
      }),
    ).toHaveAttribute(
      "href",
      "https://tarkov.dev/item/briefcase-with-documents",
    );
    expect(
      screen.getByRole("img", {
        name: "5x BD dogtag •| Ferrum",
      }),
    ).toHaveAttribute("src", "/images/recipes/bd-dogtag-ferrum.png");
    expect(
      screen.getByRole("img", {
        name: "1x Briefcase with documents",
      }),
    ).toHaveAttribute("src", "/images/recipes/briefcase-with-documents.png");
  });

  it("copies each launcher code independently and reports clipboard failure", async () => {
    render(<RecipesPage />);

    const firstCopyButton = screen.getByRole("button", {
      name: "Copy promo code 1",
    });
    fireEvent.click(firstCopyButton);

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        "6NU9-UFK1-W2TX-89RW-M96B",
      );
    });
    expect(
      screen.getByRole("button", { name: "Copied promo code 1" }),
    ).toHaveTextContent("Copied");
    expect(
      screen.getByRole("button", { name: "Copy promo code 2" }),
    ).toBeInTheDocument();

    clipboardWriteTextMock.mockRejectedValueOnce(new Error("blocked"));
    fireEvent.click(screen.getByRole("button", { name: "Copy promo code 2" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Copy failed for promo code 2",
        }),
      ).toHaveTextContent("Copy failed");
    });
    expect(screen.getByText("6NU9-W2TX-UFK1-89RW-M96B")).toHaveClass(
      "select-all",
    );
  });

  it("finds the special recipe by launcher terms and an exact promo code", async () => {
    render(<RecipesPage />);

    const search = screen.getByPlaceholderText("Search items or recipes...");
    fireEvent.change(search, { target: { value: "launcher" } });

    await waitFor(() => {
      expect(screen.getByText("1 recipe")).toBeInTheDocument();
    });
    expect(screen.getByText("Step 1 · Launcher unlock")).toBeInTheDocument();

    fireEvent.change(search, {
      target: { value: "UFK1-W2TX-6NU9-89RW-M96B" },
    });

    await waitFor(() => {
      expect(screen.getByText("1 recipe")).toBeInTheDocument();
    });
    expect(screen.getByText("UFK1-W2TX-6NU9-89RW-M96B")).toBeInTheDocument();
  });

  it("sorts HH:MM:SS crafting times numerically", () => {
    render(<RecipesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Fastest First" }));

    const checkboxNames = screen
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.getAttribute("aria-label"));
    expect(checkboxNames).toEqual([
      "Mark recipe requiring 1x Alpha sacrifice as completed",
      "Mark recipe requiring 5x BD dogtag •| Ferrum as completed",
      "Mark recipe requiring 1x Bravo sacrifice as completed",
    ]);
  });

  it("keeps the supplied reward image when API item data is available", () => {
    getItemByNameMock.mockImplementation((name: string) =>
      name.includes("Briefcase")
        ? {
            id: "briefcase",
            name: "Briefcase with documents",
            shortName: "Briefcase",
            basePrice: 0,
            iconLink: "https://assets.tarkov.dev/briefcase-icon.webp",
            link: "https://tarkov.dev/item/briefcase-with-documents",
          }
        : null,
    );

    render(<RecipesPage />);

    expect(
      screen.getByRole("img", { name: "1x Briefcase with documents" }),
    ).toHaveAttribute("src", "/images/recipes/briefcase-with-documents.png");
  });

  it("chooses the reporting mode from the clicked recipe action", async () => {
    render(<RecipesPage />);

    await screen.findAllByText("10");

    const workedButtons = screen.getAllByRole("button", {
      name: /mark as worked/i,
    });
    const didntWorkButtons = screen.getAllByRole("button", {
      name: /mark as didn't work/i,
    });

    expect(workedButtons).toHaveLength(3);
    expect(didntWorkButtons).toHaveLength(3);

    expect(
      screen.queryByText("Community recipe reports"),
    ).not.toBeInTheDocument();
    fireEvent.click(workedButtons[0]);
    const modeGroup = screen.getByRole("radiogroup", {
      name: /game mode for worked report/i,
    });
    fireEvent.click(within(modeGroup).getByRole("radio", { name: "PVE" }));
    await waitFor(() =>
      expect(workedButtons[0]).toHaveAttribute("aria-pressed", "true"),
    );
    expect(workedButtons[1]).toHaveAttribute("aria-pressed", "false");
    const post = vi
      .mocked(fetch)
      .mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      vote: "worked",
      gameMode: "pve",
    });
  });

  it("scrolls to and highlights the recipe from a share link", async () => {
    const scrollIntoViewMock = vi.fn();
    const proto = window.HTMLElement.prototype as unknown as {
      scrollIntoView?: unknown;
    };
    const originalScrollIntoView = proto.scrollIntoView;
    proto.scrollIntoView = scrollIntoViewMock;
    window.history.replaceState({}, "", "/recipes?recipe=recipe-bravo");

    try {
      render(<RecipesPage />);

      expect(highlightedState("recipe-alpha")).toBe("false");
      expect(highlightedState("recipe-bravo")).toBe("true");
      // The deep-link target renders at its real size for accurate scrolling.
      expect(
        document.getElementById("recipe-bravo")?.className,
      ).toContain("[content-visibility:visible]");
      expect(
        document.getElementById("recipe-alpha")?.className,
      ).toContain("[content-visibility:auto]");

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith(
          expect.objectContaining({ behavior: "smooth", block: "center" }),
        );
      });
      expect(scrollIntoViewMock.mock.instances[0]).toBe(
        document.getElementById("recipe-bravo"),
      );
    } finally {
      window.history.replaceState({}, "", "/");
      proto.scrollIntoView = originalScrollIntoView;
    }
  });

  it("ignores unknown recipe share links", () => {
    window.history.replaceState({}, "", "/recipes?recipe=recipe-missing");

    try {
      render(<RecipesPage />);

      for (const id of ["recipe-promo", "recipe-alpha", "recipe-bravo"]) {
        expect(highlightedState(id)).toBe("false");
      }
    } finally {
      window.history.replaceState({}, "", "/");
    }
  });

  it("copies a share link and highlights the shared recipe", async () => {
    window.history.replaceState({}, "", "/recipes");

    try {
      render(<RecipesPage />);

      fireEvent.click(
        screen.getByRole("button", {
          name: /copy link to recipe requiring 1x alpha sacrifice/i,
        }),
      );

      await waitFor(() => {
        expect(clipboardWriteTextMock).toHaveBeenCalledWith(
          `${window.location.origin}/recipes?recipe=recipe-alpha`,
        );
      });
      expect(
        screen.getByRole("button", {
          name: /copied link to recipe requiring 1x alpha sacrifice/i,
        }),
      ).toBeInTheDocument();
      expect(highlightedState("recipe-alpha")).toBe("true");
      expect(window.location.search).toBe("?recipe=recipe-alpha");
    } finally {
      window.history.replaceState({}, "", "/");
    }
  });

  it("re-scrolls when layout shift moves the shared recipe", async () => {
    const scrollIntoViewMock = vi.fn();
    const proto = window.HTMLElement.prototype as unknown as {
      scrollIntoView?: unknown;
    };
    const originalScrollIntoView = proto.scrollIntoView;
    proto.scrollIntoView = scrollIntoViewMock;
    window.history.replaceState({}, "", "/recipes?recipe=recipe-alpha");

    try {
      render(<RecipesPage />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
      const callsAfterArrival = scrollIntoViewMock.mock.calls.length;

      // Simulate cards above growing and pushing the target far down.
      const target = document.getElementById("recipe-alpha");
      expect(target).not.toBeNull();
      vi.spyOn(target as HTMLElement, "getBoundingClientRect").mockReturnValue(
        {
          x: 0,
          y: 2000,
          width: 100,
          height: 400,
          top: 2000,
          right: 100,
          bottom: 2400,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect,
      );

      await waitFor(
        () => {
          expect(scrollIntoViewMock.mock.calls.length).toBeGreaterThan(
            callsAfterArrival,
          );
        },
        { timeout: 3000 },
      );
    } finally {
      window.history.replaceState({}, "", "/");
      proto.scrollIntoView = originalScrollIntoView;
    }
  });

  it("reports share link copy failure", async () => {
    render(<RecipesPage />);

    clipboardWriteTextMock.mockRejectedValueOnce(new Error("blocked"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /copy link to recipe requiring 1x bravo sacrifice/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /copy failed for recipe requiring 1x bravo sacrifice/i,
        }),
      ).toBeInTheDocument();
    });
  });
});
