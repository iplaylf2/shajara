import type { ArrayValues } from "type-fest";
import { forkJoinExample } from "./fork-join";

export function readExplorerExample(exampleId: ExplorerExampleId): ExplorerExampleDefinition {
  const example = EXPLORER_EXAMPLES.find((entry) => entry.id === exampleId);

  if (!example) {
    throw new Error(`Unknown explorer example: ${exampleId}`);
  }

  return example;
}

export const EXPLORER_EXAMPLES = [forkJoinExample] as const;
export const EXPLORER_EXAMPLE_IDS = EXPLORER_EXAMPLES.map((example) => example.id);
export const DEFAULT_EXPLORER_EXAMPLE_ID = readFirstExplorerExample().id;

export type ExplorerExampleId = (typeof EXPLORER_EXAMPLE_IDS)[number];
export type ExplorerExampleDefinition = ArrayValues<typeof EXPLORER_EXAMPLES>;

function readFirstExplorerExample(): ExplorerExampleDefinition {
  const [firstExplorerExample] = EXPLORER_EXAMPLES;

  if (!firstExplorerExample) {
    throw new Error("Explorer requires at least one example.");
  }

  return firstExplorerExample;
}
