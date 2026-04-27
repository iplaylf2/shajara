import type { ExplorerExampleCodeLine } from "#/domain/explorer/contract";

export function codeLine<TEvent extends string>(
  id: TEvent,
  text: string,
  completedEvents?: readonly TEvent[],
): ExplorerExampleCodeLine<TEvent> {
  if (!completedEvents) {
    return { id, text };
  }

  return { completedEvents, id, text };
}
