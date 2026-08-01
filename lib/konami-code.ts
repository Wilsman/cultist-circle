export const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

export const KONAMI_SESSION_KEY = "cultist-circle:konami-unlocked:v1";

export interface KonamiBufferResult {
  buffer: string[];
  matched: boolean;
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function advanceKonamiBuffer(
  currentBuffer: readonly string[],
  key: string,
): KonamiBufferResult {
  const buffer = [...currentBuffer, normalizeKey(key)].slice(
    -KONAMI_SEQUENCE.length,
  );
  const matched =
    buffer.length === KONAMI_SEQUENCE.length &&
    KONAMI_SEQUENCE.every((expected, index) => buffer[index] === expected);

  return { buffer: matched ? [] : buffer, matched };
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const editableAncestor = target.closest("[contenteditable]");
  const isContentEditable =
    target.isContentEditable ||
    target.contentEditable === "true" ||
    (editableAncestor !== null &&
      editableAncestor.getAttribute("contenteditable") !== "false");

  return (
    isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}
