import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  dependencyLink,
  parentRoutineNode,
  spawnLink,
} from "#/domain/explorer/examples-kit";
import { createRaceWinnerDemoCode, raceWinnerDemo } from "./runtime";
import type { RaceWinnerDemoEvent } from "./runtime";

export const raceWinnerExample = {
  descriptionKey: "explorer.examples.race-winner.description",
  guideKeys: [
    "explorer.examples.race-winner.guide.race",
    "explorer.examples.race-winner.guide.winner",
  ],
  id: "race-winner",
  stage: {
    code: createRaceWinnerDemoCode(),
    flow: createRaceWinnerFlow(),
    replay: {
      replayDelayMs: 1400,
      runtime: {
        createRoutine: () => raceWinnerDemo,
      },
    },
  },
  titleKey: "explorer.examples.race-winner.title",
} as const satisfies ExplorerExample<RaceWinnerDemoEvent, string, string>;

function createRaceWinnerFlow(): ExplorerFlowGraph<RaceWinnerDemoEvent> {
  return {
    links: createRaceWinnerFlowLinks(),
    nodes: createRaceWinnerFlowNodes(),
  };
}

function createRaceWinnerFlowLinks(): ExplorerFlowGraph<RaceWinnerDemoEvent>["links"] {
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

function createRaceWinnerFlowNodes(): ExplorerFlowGraph<RaceWinnerDemoEvent>["nodes"] {
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
