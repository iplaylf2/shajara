import type { ExplorerEventId, ExplorerExampleCodeLine } from "#/domain/explorer/contract";

export type ExplorerAuthoredEvent<
  TCode extends readonly ExplorerExampleCodeLine<ExplorerEventId>[],
  TExtraEvent extends ExplorerEventId = never,
> = ExplorerCodeLineEvent<TCode> | TExtraEvent;

type ExplorerCodeLineEvent<TCode extends readonly ExplorerExampleCodeLine<ExplorerEventId>[]> =
  TCode[number] extends infer TLine
    ? TLine extends ExplorerExampleCodeLine<ExplorerEventId>
      ? TLine["id"] | ExplorerCodeLineCompletedEvent<TLine>
      : never
    : never;

type ExplorerCodeLineCompletedEvent<TLine> = TLine extends {
  readonly completion: {
    readonly events: readonly (infer TEvent)[];
  };
}
  ? TEvent & ExplorerEventId
  : never;
