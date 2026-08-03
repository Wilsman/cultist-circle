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

const mockRecipes = vi.hoisted(() => [
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
const useRecipeItemDataMock = vi.hoisted(() =>
  vi.fn(() => ({ getItemByName: () => null })),
);

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
    expect(screen.getByText("1 / 2 done")).toBeInTheDocument();
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
      within(resetDialog).getByText(/mark all 2 recipes as unfinished/i),
    ).toBeInTheDocument();

    fireEvent.click(
      within(resetDialog).getByRole("button", {
        name: "Reset progress",
        exact: true,
      }),
    );

    expect(screen.getByText("0 / 2 done")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
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

    expect(screen.getByText("0 / 2 done")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });
});
