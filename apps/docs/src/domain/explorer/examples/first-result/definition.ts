import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createFirstResultDemoCode, firstResultDemo } from "./runtime";
import type { FirstResultDemoEvent } from "./runtime";

export const firstResultExample = {
  descriptionKey: "explorer.examples.first-result.description",
  guideKeys: [
    "explorer.examples.first-result.guide.race",
    "explorer.examples.first-result.guide.winner",
  ],
  id: "first-result",
  stage: {
    code: createFirstResultDemoCode(),
    flow: createFirstResultFlow(),
    replay: {
      replayDelayMs: 1400,
      runtime: {
        createRoutine: () => firstResultDemo,
      },
    },
  },
  titleKey: "explorer.examples.first-result.title",
} as const satisfies ExplorerExample<FirstResultDemoEvent, string, string>;

function createFirstResultFlow(): ExplorerFlow<FirstResultDemoEvent> {
  return {
    links: createFirstResultFlowLinks(),
    nodes: createFirstResultFlowNodes(),
  };
}

function createFirstResultFlowLinks(): ExplorerFlow<FirstResultDemoEvent>["links"] {
  return [
    spawnLink("root", "winner", "race(readCache, fetchNetwork)", ["race-open"]),
    spawnLink("winner", "cache", "readCache", ["launch-cache"]),
    spawnLink("winner", "network", "fetchNetwork", ["launch-network"]),
    waitLink("cache", "winner", "winner", {
      activeEvents: ["race-wait-cache"],
      displayLabel: { kind: "hidden" },
      interruption: { events: ["cache-canceled"], kind: "interruptible" },
    }),
    waitLink("network", "winner", "remaining branch", {
      activeEvents: ["race-wait-network"],
      displayLabel: { kind: "hidden" },
      interruption: { events: ["network-canceled"], kind: "interruptible" },
    }),
    waitLink("winner", "root", "first result", {
      activeEvents: ["race-wait-result"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createFirstResultFlowNodes(): ExplorerFlow<FirstResultDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "loadProfile", {
      activeEvents: ["routine", "race-open", "race-wait-result", "return-profile", "done"],
      completedEvents: ["done"],
    }),
    branchRoutineNode("cache", "readCache", {
      activeEvents: ["cache-open", "cache-sleep", "cache-return", "cache-canceled"],
      completedEvents: ["cache-return", "cache-canceled"],
    }),
    branchRoutineNode("network", "fetchNetwork", {
      activeEvents: ["network-open", "network-sleep", "network-return", "network-canceled"],
      completedEvents: ["network-return", "network-canceled"],
    }),
    {
      activeEvents: [
        "race-open",
        "launch-cache",
        "launch-network",
        "race-wait-cache",
        "race-wait-network",
        "cache-return",
        "cache-canceled",
        "network-return",
        "race-wait-result",
        "network-canceled",
      ],
      completedEvents: ["race-wait-result"],
      id: "winner",
      kind: "join",
      label: "race result",
      statusRoutineIds: ["root", "race"],
    },
  ];
}
