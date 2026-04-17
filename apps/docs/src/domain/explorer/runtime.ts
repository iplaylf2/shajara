import type { HostConcurrencyResult } from "#/domain/explorer/host-concurrency/runtime";
import type { ValueOf } from "type-fest";
import { createHostConcurrencyReplay } from "#/domain/explorer/host-concurrency/runtime";

export function readExplorerReplayRuntime(
  runtimeId: ExplorerReplayRuntimeId,
): AnyExplorerReplayRuntime {
  return EXPLORER_REPLAY_RUNTIMES[runtimeId];
}

export type ExplorerReplayRuntimeId = keyof typeof EXPLORER_REPLAY_RUNTIMES;
type AnyExplorerReplayRuntime = ValueOf<typeof EXPLORER_REPLAY_RUNTIMES>;

const EXPLORER_REPLAY_RUNTIMES = {
  "host-concurrency": {
    createRunner: createHostConcurrencyReplay,
    formatResult(result: HostConcurrencyResult): string {
      return `${result.header} + ${result.sidebar}`;
    },
  },
} as const;
