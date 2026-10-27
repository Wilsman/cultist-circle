import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OtherTestForm } from "@/components/base-value-lab/other-test-form";
import type { MinimalItem } from "@/hooks/use-tarkov-api";
import type { Subject } from "@/lib/base-value-lab";

const subject = (over: Partial<Subject> & { id: string }): Subject => ({
  mode: "pve",
  name: over.id,
  kind: "other",
  owned: 1,
  ...over,
});

const subjects: Subject[] = [
  subject({
    id: "mp5-default",
    kind: "weapon",
    name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
    itemId: "59411aa786f7747aeb37f9a5",
    durability: 100,
  } as Partial<Subject> & { id: string }),
  subject({ id: "key", name: "Some key" }),
];

const item = (id: string, name: string, basePrice: number): MinimalItem =>
  ({
    id,
    name,
    shortName: name,
    basePrice,
    categories: [],
    sellFor: [],
    buyFor: [],
  }) as unknown as MinimalItem;

const items = [
  item("675a0288c3102563bd01c9c3", "Arena advertisement poster", 35_000),
  item("5a7afa25e899ef00135e31b0", "Glock Polymer80 PS9 pistol slide", 14_122),
];

afterEach(cleanup);

describe("OtherTestForm", () => {
  it("sends exactly what the tester says they put in the circle", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <OtherTestForm
        subjects={subjects}
        items={items}
        sending={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "I did a different test" }),
    );
    const send = screen.getByRole("button", { name: "Send result" });
    expect(send).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Add a tested item/ }));
    // Guns are labelled with their version so testers can tell them apart.
    expect(
      screen.getByRole("option", {
        name: "HK MP5 (Navy 3 Round Burst) (Default)",
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search for an item"), {
      target: { value: "poster" },
    });
    fireEvent.click(screen.getByText("Arena advertisement poster"));
    fireEvent.change(screen.getByLabelText("Search for an item"), {
      target: { value: "ps9" },
    });
    fireEvent.click(screen.getByText("Glock Polymer80 PS9 pistol slide"));

    fireEvent.click(screen.getByRole("button", { name: "8h" }));
    expect(send).toBeEnabled();
    fireEvent.click(send);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      entries: [{ subjectId: "mp5-default", qty: 1 }],
      fillers: [
        {
          itemId: "675a0288c3102563bd01c9c3",
          name: "Arena advertisement poster",
          baseValue: 35_000,
          qty: 1,
        },
        {
          itemId: "5a7afa25e899ef00135e31b0",
          name: "Glock Polymer80 PS9 pistol slide",
          baseValue: 14_122,
          qty: 1,
        },
      ],
      timer: "8h",
      notes: "",
    });
    // A saved test closes the form again.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "I did a different test" }),
      ).toBeInTheDocument(),
    );
  });

  it("keeps what was typed when the result could not be saved", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <OtherTestForm
        subjects={subjects}
        items={items}
        sending={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "I did a different test" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Add a tested item/ }));
    fireEvent.click(screen.getByRole("button", { name: "6h" }));
    fireEvent.click(screen.getByRole("button", { name: "Send result" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Send result" })).toBeEnabled();
    expect(screen.getByLabelText("Item")).toBeInTheDocument();
  });
});
