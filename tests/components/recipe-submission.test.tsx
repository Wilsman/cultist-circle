import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeSubmissionButton } from "@/components/recipe-submission";

vi.mock("@/hooks/use-items-data", () => ({
  useItemsData: () => ({
    data: [
      {
        id: "5d1b3a5d86f774252167ba22",
        name: "Test sacrifice",
        shortName: "Sacrifice",
      },
      {
        id: "5d1b3a5d86f774252167ba23",
        name: "Test reward",
        shortName: "Reward",
      },
    ],
    isLoading: false,
    hasError: false,
  }),
}));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function fillItems() {
  fireEvent.click(screen.getByRole("button", { name: "Submit a recipe" }));
  fireEvent.click(screen.getByRole("button", { name: "Add sacrificed item" }));
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "sacrifice" },
  });
  fireEvent.click(
    await screen.findByRole("option", { name: "Test sacrifice" }),
  );
  fireEvent.change(screen.getByLabelText("Quantity of Test sacrifice"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add reward item" }));
  fireEvent.click(await screen.findByRole("option", { name: "Test reward" }));
}

describe("Recipe submission modal", () => {
  it("submits selected quantities, current game mode and a custom timer", async () => {
    const fetchMock = vi.fn(async (_url, init) =>
      Response.json(
        {
          success: true,
          status: "pending",
          id: JSON.parse(init.body).submissionId,
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RecipeSubmissionButton mode="pve" />);
    await fillItems();
    fireEvent.click(screen.getByLabelText("Other special timer"));
    fireEvent.change(screen.getByLabelText("minutes"), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByLabelText("seconds"), {
      target: { value: "6" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit recipe for review" }),
    );
    expect(await screen.findByText("Recipe submitted")).toBeInTheDocument();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      gameMode: "pve",
      timerSeconds: 666,
      sacrifices: [{ id: "5d1b3a5d86f774252167ba22", quantity: 2 }],
      rewards: [{ id: "5d1b3a5d86f774252167ba23", quantity: 1 }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit another" }));
    expect(
      screen.getByRole("button", { name: "Submit recipe for review" }),
    ).toBeDisabled();
  });

  it("retains selections on failure and reuses the submission ID when retrying", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<RecipeSubmissionButton mode="pvp" />);
    await fillItems();
    fireEvent.click(screen.getByLabelText("66 minutes"));
    fireEvent.click(
      screen.getByRole("button", { name: "Submit recipe for review" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your selections are saved here",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit a recipe" }));
    expect(screen.getByLabelText("Quantity of Test sacrifice")).toHaveValue(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit recipe for review" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][1].body).toBe(
      fetchMock.mock.calls[1][1].body,
    );
  });

  it("rejects a regular timer entered as Other", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RecipeSubmissionButton mode="season" />);
    await fillItems();
    fireEvent.click(screen.getByLabelText("Other special timer"));
    fireEvent.change(screen.getByLabelText("hours"), {
      target: { value: "6" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit recipe for review" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Regular sacrifice timers",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
