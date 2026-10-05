import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NOTIFICATIONS, UPDATE_IDS } from "@/components/notification-panel";
import {
  SEEN_UPDATES_STORAGE_KEY,
  getUnseenIds,
} from "@/hooks/use-seen-updates";

let markSeenDelay = 0;

function storedSeenIds() {
  return JSON.parse(
    window.localStorage.getItem(SEEN_UPDATES_STORAGE_KEY) ?? "[]",
  );
}

// The seen list is read once per page load, so each render gets fresh
// modules to stand in for a new visit.
async function renderVisit() {
  vi.resetModules();
  const { UpdateAlertBar, MARK_SEEN_DELAY_MS } =
    await import("@/components/app/update-alert-bar");
  const { UpdatesBell } = await import("@/components/updates-bell");
  const { LanguageProvider } = await import("@/contexts/language-context");
  markSeenDelay = MARK_SEEN_DELAY_MS;
  return render(
    <LanguageProvider>
      <UpdatesBell />
      <UpdateAlertBar />
    </LanguageProvider>,
  );
}

const alertBar = () => screen.queryByRole("region", { name: "New updates" });

describe("Update alerts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows new updates on a first visit and hides them on the next", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await renderVisit();
    expect(alertBar()).toHaveTextContent(NOTIFICATIONS[0].title);
    expect(alertBar()).toHaveTextContent(`1/${NOTIFICATIONS.length}`);
    expect(
      screen.getByRole("button", {
        name: `Updates (${NOTIFICATIONS.length} new)`,
      }),
    ).toBeInTheDocument();

    // A load cut short (e.g. the version-change reload) marks nothing.
    act(() => vi.advanceTimersByTime(markSeenDelay - 1));
    expect(storedSeenIds()).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(storedSeenIds()).toEqual(UPDATE_IDS);
    // Still shown for the rest of this visit.
    expect(alertBar()).toBeInTheDocument();
    vi.useRealTimers();

    cleanup();
    await renderVisit();
    expect(alertBar()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Updates" })).toBeInTheDocument();
  });

  it("shows only updates that have not been seen", async () => {
    window.localStorage.setItem(
      SEEN_UPDATES_STORAGE_KEY,
      JSON.stringify(UPDATE_IDS.slice(1)),
    );

    await renderVisit();
    expect(alertBar()).toHaveTextContent(NOTIFICATIONS[0].title);
    expect(alertBar()).not.toHaveTextContent("1/");
    expect(
      screen.getByRole("button", { name: "Updates (1 new)" }),
    ).toBeInTheDocument();
  });

  it("dismissing the bar clears the bell count right away", async () => {
    await renderVisit();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss updates" }));

    expect(alertBar()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Updates" })).toBeInTheDocument();
    expect(storedSeenIds()).toEqual(UPDATE_IDS);
  });

  it("opening the bell lists every update and flags the new ones", async () => {
    window.localStorage.setItem(
      SEEN_UPDATES_STORAGE_KEY,
      JSON.stringify(UPDATE_IDS.slice(1)),
    );
    await renderVisit();

    fireEvent.click(screen.getByRole("button", { name: "Updates (1 new)" }));

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(NOTIFICATIONS.length);
    expect(items[0]).toHaveTextContent("New");
    expect(items[1]).not.toHaveTextContent("New");
    expect(alertBar()).not.toBeInTheDocument();
    expect(storedSeenIds()).toEqual(UPDATE_IDS);
  });

  it("treats unreadable storage as nothing seen", () => {
    expect(getUnseenIds(["a", "b"], "not json")).toEqual(new Set(["a", "b"]));
    expect(getUnseenIds(["a", "b"], '["a","gone"]')).toEqual(new Set(["b"]));
  });
});
