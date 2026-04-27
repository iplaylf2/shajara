// oxlint-disable max-lines-per-function
import { codeLine, cursorAt } from "#/domain/explorer/examples-kit";
import { enclose, race, wait } from "@shajara/host/primitives";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createRaceWinnerDemoCode() {
  return [
    codeLine("routine", "function* loadProfile() {", ["done"]),
    codeLine("race-open", "  const firstProfile = yield* race([", ["wait-race"]),
    codeLine("cache-open", "    function* readCache() {", ["cache-return"]),
    codeLine("cache-sleep", `      yield* sleep(${cacheDelayMs});`, ["cache-return"]),
    codeLine("cache-return", '      return "cached profile";', ["cache-return"]),
    codeLine("cache-close", "    },", ["cache-return"]),
    codeLine("network-open", "    function* fetchNetwork() {", ["network-canceled"]),
    codeLine("network-sleep", `      yield* sleep(${networkDelayMs});`, ["network-canceled"]),
    codeLine("network-return", '      return "fresh profile";', ["network-return"]),
    codeLine("network-close", "    },", ["network-canceled"]),
    codeLine("race-close", "  ] as const);", ["wait-race"]),
    codeLine("wait-race", "  const profile = yield* wait(firstProfile);", ["wait-race"]),
    codeLine("return-profile", "  return profile;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* raceWinnerDemo(
  emit: ExplorerReplayEmit<RaceWinnerDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* loadProfile(): RiteCoroutine<string> {
    yield* emit({
      cursors: [
        cursorAt("root", "race-open", "running"),
        cursorAt("race", ["launch-cache", "launch-network"], "running"),
      ],
    });
    const firstProfile = yield* race([
      function* readCache(): RiteCoroutine<string> {
        yield* emit({
          cursors: [
            cursorAt("race", ["race-wait-cache", "race-wait-network"], "blocked"),
            cursorAt("cache", "cache-sleep", "running"),
          ],
        });
        yield* sleep(cacheDelayMs);
        yield* emit({
          cursor: cursorAt("cache", ["cache-return", "cache-close"], "running"),
        });
        try {
          return "cached profile";
        } finally {
          yield* emit({
            clearCursor: "cache",
            completed: ["cache-return", "race-wait-cache"],
            cursor: cursorAt("race", "race-wait-network", "blocked"),
          });
        }
      },
      function* fetchNetwork(): RiteCoroutine<string> {
        yield* emit({
          cursors: [
            cursorAt("race", ["race-wait-cache", "race-wait-network"], "blocked"),
            cursorAt("network", "network-sleep", "running"),
          ],
        });
        try {
          yield* sleep(networkDelayMs);
          yield* emit({
            cursor: cursorAt("network", ["network-return", "network-close"], "running"),
          });
          return "fresh profile";
        } finally {
          yield* emit({
            clearCursor: "network",
            completed: ["network-canceled", "race-wait-network"],
          });
        }
      },
    ] as const);

    yield* emit({
      cursor: cursorAt("root", "wait-race", "blocked"),
    });
    const profile = yield* wait(firstProfile);
    yield* emit({
      clearCursor: "race",
      completed: "wait-race",
      cursor: cursorAt("root", "return-profile", "running"),
    });

    try {
      return profile;
    } finally {
      yield* emit({
        clearCursor: "root",
        completed: "done",
      });
    }
  });
}

export type RaceWinnerDemoEvent =
  | ReturnType<typeof createRaceWinnerDemoCode>[number]["id"]
  | "launch-cache"
  | "launch-network"
  | "network-canceled"
  | "race-wait-cache"
  | "race-wait-network";

const cacheDelayMs = 1000;
const networkDelayMs = 2200;
