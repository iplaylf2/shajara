import type { ForkJoinResult } from "#/domain/explorer/fork-join/runtime";
import type { ValueOf } from "type-fest";
import { createForkJoinReplay } from "#/domain/explorer/fork-join/runtime";

export function readExplorerReplayRuntime(
  runtimeId: ExplorerReplayRuntimeId,
): AnyExplorerReplayRuntime {
  return EXPLORER_REPLAY_RUNTIMES[runtimeId];
}

export type ExplorerReplayRuntimeId = keyof typeof EXPLORER_REPLAY_RUNTIMES;
type AnyExplorerReplayRuntime = ValueOf<typeof EXPLORER_REPLAY_RUNTIMES>;

const EXPLORER_REPLAY_RUNTIMES = {
  "fork-join": {
    createRunner: createForkJoinReplay,
    formatResult(result: ForkJoinResult): string {
      return `${result.header} + ${result.sidebar}`;
    },
  },
} as const;
