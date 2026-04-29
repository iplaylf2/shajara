import type {
  ExplorerExampleCodeLine,
  ExplorerExampleCodeSpacer,
} from "#/domain/explorer/contract";

export function codeLine<TEvent extends string>(
  id: TEvent,
  text: string,
  completedEvents: readonly TEvent[],
): ExplorerExampleCodeLine<TEvent> {
  return { completion: { events: completedEvents }, id, text };
}

export function codeSpacer(): ExplorerExampleCodeSpacer {
  return { kind: "spacer", text: "" };
}
