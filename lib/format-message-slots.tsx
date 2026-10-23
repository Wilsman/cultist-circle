import { Fragment, type ReactNode } from "react";

/**
 * Swaps `{name}` placeholders in a translated message for React nodes, so a
 * sentence with links or emphasis stays one translatable string.
 */
export function formatMessageSlots(
  message: string,
  slots: Record<string, ReactNode>,
): ReactNode[] {
  return message.split(/(\{\w+\})/g).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    const content =
      name && Object.prototype.hasOwnProperty.call(slots, name)
        ? slots[name]
        : part;
    return <Fragment key={index}>{content}</Fragment>;
  });
}
