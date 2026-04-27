import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  dependencyLink,
  parentRoutineNode,
  spawnLink,
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

function createFirstResultFlow(): ExplorerFlowGraph<FirstResultDemoEvent> {
  return {
    links: createFirstResultFlowLinks(),
    nodes: createFirstResultFlowNodes(),
  };
}

function createFirstResultFlowLinks(): ExplorerFlowGraph<FirstResultDemoEvent>["links"] {
  return [
    spawnLink("root", "winner", "race(firstProfile)", ["race-open"]),
    spawnLink("winner", "cache", "readCache", ["launch-cache"]),
    spawnLink("winner", "network", "fetchNetwork", ["launch-network"]),
    dependencyLink("cache", "winner", "winner", {
      activeEvents: ["race-wait-cache"],
    }),
    dependencyLink("network", "winner", "loser settles with arena", {
      activeEvents: ["race-wait-network"],
    }),
    dependencyLink("winner", "root", "wait(firstProfile)", {
      activeEvents: ["wait-race"],
    }),
  ];
}

function createFirstResultFlowNodes(): ExplorerFlowGraph<FirstResultDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "loadProfile", {
      activeEvents: ["routine", "race-open", "wait-race", "return-profile", "done"],
      completedEvents: ["done"],
    }),
    branchRoutineNode("cache", "readCache", {
      activeEvents: ["cache-open", "cache-sleep", "cache-return"],
      completedEvents: ["cache-return"],
    }),
    branchRoutineNode("network", "fetchNetwork", {
      activeEvents: ["network-open", "network-sleep", "network-canceled"],
      completedEvents: ["network-canceled"],
    }),
    {
      activeEvents: [
        "race-open",
        "launch-cache",
        "launch-network",
        "race-wait-cache",
        "race-wait-network",
        "cache-return",
        "wait-race",
        "network-canceled",
      ],
      completedEvents: ["wait-race"],
      id: "winner",
      kind: "join",
      label: "firstProfile",
      statusRoutineIds: ["root", "race"],
    },
  ];
}
