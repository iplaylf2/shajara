// oxlint-disable max-lines-per-function
import { branch, race } from "@shajara/host/primitives";
import {
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  raceWait,
  setCursor,
  setCursors,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createFirstResultDemoCode() {
  return [
    codeLine("routine", "function* loadProfile() {", ["done"]),
    codeLine("race-open", "  const profile = yield* race([", ["race-wait-result"]),
    codeLine("cache-open", "    function* readCache() {", ["cache-canceled", "cache-return"]),
    codeLine("cache-sleep", `      yield* sleep(${cacheDelayMs});`, [
      "cache-canceled",
      "cache-return",
    ]),
    codeLine("cache-return", '      return "cached profile";', ["cache-return"]),
    codeLine("cache-close", "    },", ["cache-return"]),
    codeSpacer(),
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
    codeLine("race-close", "  ] as const);", ["race-wait-result"]),
    codeSpacer(),
    codeLine("return-profile", "  return profile;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* firstResultDemo(
  emit: ExplorerReplayEmit<FirstResultDemoEvent>,
): RiteCoroutine<string> {
  return yield* branch(function* loadProfile(): RiteCoroutine<string> {
    emit({
      actions: [
        setCursors([
          cursorAt("root", ["race-open", "launch-race"], "running"),
          cursorAt("race", ["launch-cache", "launch-network"], "running"),
        ]),
      ],
    });
    const profile = yield* race(
      raceWait(
        emit,
        {
          caller: cursorAt("root", ["race-open", "race-wait-result"], "blocked"),
          coordinator: cursorAt("race", ["race-wait-cache", "race-wait-network"], "blocked"),
        },
        [
          {
            cancelEvent: "cache-canceled",
            *routine(): RiteCoroutine<string> {
              emit({ actions: [setCursor(cursorAt("cache", "cache-sleep", "running"))] });
              yield* sleep(cacheDelayMs);
              emit({
                actions: [setCursor(cursorAt("cache", ["cache-return", "cache-close"], "running"))],
              });

              try {
                return "cached profile";
              } finally {
                emit({
                  actions: [
                    clearCursor("cache"),
                    completeEvents(["cache-return", "race-wait-cache"]),
                    setCursor(cursorAt("race", "race-wait-network", "blocked")),
                  ],
                });
              }
            },
            routineId: "cache",
            waitEvent: "race-wait-cache",
          },
          {
            cancelEvent: "network-canceled",
            *routine(): RiteCoroutine<string> {
              emit({ actions: [setCursor(cursorAt("network", "network-sleep", "running"))] });
              yield* sleep(networkDelayMs);
              emit({
                actions: [
                  setCursor(cursorAt("network", ["network-return", "network-close"], "running")),
                ],
              });

              try {
                return "fresh profile";
              } finally {
                emit({
                  actions: [
                    clearCursor("network"),
                    completeEvents(["network-return", "race-wait-network"]),
                    setCursor(cursorAt("race", "race-wait-cache", "blocked")),
                  ],
                });
              }
            },
            routineId: "network",
            waitEvent: "race-wait-network",
          },
        ] as const,
      ),
    );

    emit({
      actions: [
        clearCursor("race"),
        completeEvents("race-wait-result"),
        setCursor(cursorAt("root", "return-profile", "running")),
      ],
    });

    try {
      return profile;
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type FirstResultDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createFirstResultDemoCode>,
  | "launch-race"
  | "launch-cache"
  | "launch-network"
  | "race-wait-cache"
  | "race-wait-network"
  | "race-wait-result"
>;

const cacheDelayMs = 1000;
const networkDelayMs = 6000;
