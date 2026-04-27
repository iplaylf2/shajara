// oxlint-disable max-lines-per-function
import { codeLine, cursorAt, raceBranch } from "#/domain/explorer/examples-kit";
import { enclose, race, wait } from "@shajara/host/primitives";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createFirstResultDemoCode() {
  return [
    codeLine("routine", "function* loadProfile() {", ["done"]),
    codeLine("race-open", "  const firstProfile = yield* race([", ["wait-race"]),
    codeLine("cache-open", "    function* readCache() {", ["cache-canceled", "cache-return"]),
    codeLine("cache-sleep", `      yield* sleep(${cacheDelayMs});`, [
      "cache-canceled",
      "cache-return",
    ]),
    codeLine("cache-return", '      return "cached profile";', ["cache-return"]),
    codeLine("cache-close", "    },", ["cache-return"]),
    codeLine("network-open", "    function* fetchNetwork() {", [
      "network-canceled",
      "network-return",
    ]),
    codeLine("network-sleep", `      yield* sleep(${networkDelayMs});`, [
      "network-canceled",
      "network-return",
    ]),
    codeLine("network-return", '      return "fresh profile";', ["network-return"]),
    codeLine("network-close", "    },", ["network-return"]),
    codeLine("race-close", "  ] as const);", ["wait-race"]),
    codeLine("wait-race", "  const profile = yield* wait(firstProfile);", ["wait-race"]),
    codeLine("return-profile", "  return profile;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* firstResultDemo(
  emit: ExplorerReplayEmit<FirstResultDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* loadProfile(): RiteCoroutine<string> {
    yield* emit({
      cursors: [
        cursorAt("root", "race-open", "running"),
        cursorAt("race", ["launch-cache", "launch-network"], "running"),
      ],
    });
    const firstProfile = yield* race([
      raceBranch(
        emit,
        {
          cancelEvent: "cache-canceled",
          routineId: "cache",
          waitEvent: "race-wait-cache",
        },
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
      ),
      raceBranch(
        emit,
        {
          cancelEvent: "network-canceled",
          routineId: "network",
          waitEvent: "race-wait-network",
        },
        function* fetchNetwork(): RiteCoroutine<string> {
          yield* emit({
            cursors: [
              cursorAt("race", ["race-wait-cache", "race-wait-network"], "blocked"),
              cursorAt("network", "network-sleep", "running"),
            ],
          });
          yield* sleep(networkDelayMs);
          yield* emit({
            cursor: cursorAt("network", ["network-return", "network-close"], "running"),
          });

          try {
            return "fresh profile";
          } finally {
            yield* emit({
              clearCursor: "network",
              completed: ["network-return", "race-wait-network"],
              cursor: cursorAt("race", "race-wait-cache", "blocked"),
            });
          }
        },
      ),
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

export type FirstResultDemoEvent =
  | ReturnType<typeof createFirstResultDemoCode>[number]["id"]
  | "cache-canceled"
  | "launch-cache"
  | "launch-network"
  | "network-canceled"
  | "race-wait-cache"
  | "race-wait-network";

const cacheDelayMs = 1000;
const networkDelayMs = 2000;
