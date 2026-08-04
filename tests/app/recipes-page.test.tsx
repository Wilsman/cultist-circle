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
import RecipesPage from "@/app/recipes/page";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const mockRecipes = vi.hoisted(() => [
  {
    id: "recipe-promo",
    requiredItems: ["5x BD dogtag •| Ferrum"],
    craftingTime: "05:09:00",
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
  beforeEach(() => {
    localStorage.clear();
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
    expect(screen.getByText("05:09:00")).toBeInTheDocument();
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
});
