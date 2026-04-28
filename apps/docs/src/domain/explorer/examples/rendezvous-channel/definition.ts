import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  channelNode,
  dataLink,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createRendezvousChannelDemoCode, rendezvousChannelDemo } from "./runtime";
import type { RendezvousChannelDemoEvent } from "./runtime";

export const rendezvousChannelExample = {
  descriptionKey: "explorer.examples.rendezvous-channel.description",
  guideKeys: [
    "explorer.examples.rendezvous-channel.guide.channel",
    "explorer.examples.rendezvous-channel.guide.rendezvous",
  ],
  id: "rendezvous-channel",
  stage: {
    code: createRendezvousChannelDemoCode(),
    flow: createRendezvousChannelFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => rendezvousChannelDemo,
      },
    },
  },
  titleKey: "explorer.examples.rendezvous-channel.title",
} as const satisfies ExplorerExample<RendezvousChannelDemoEvent, string, string>;

function createRendezvousChannelFlow(): ExplorerFlowGraph<RendezvousChannelDemoEvent> {
  return {
    links: createRendezvousChannelFlowLinks(),
    nodes: createRendezvousChannelFlowNodes(),
  };
}

function createRendezvousChannelFlowLinks(): ExplorerFlowGraph<RendezvousChannelDemoEvent>["links"] {
  return [
    spawnLink("root", "courier", "spawn(courierPickup)", ["spawn-courier"]),
    waitLink("channel", "root", "send waits at channel", {
      activeEvents: ["send-meal"],
    }),
    dataLink("root", "channel", "meal enters channel", ["receive-meal"]),
    dataLink("channel", "courier", "meal reaches receiver", ["receive-meal"]),
  ];
}

function createRendezvousChannelFlowNodes(): ExplorerFlowGraph<RendezvousChannelDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "handOffTakeout", {
      activeEvents: ["routine", "channel-open", "spawn-courier", "send-meal", "send-done", "done"],
      completedEvents: ["done"],
    }),
    channelNode(
      "channel",
      "channel",
      {
        activeEvents: ["channel-open", "send-meal", "receive-meal", "send-done"],
        completedEvents: ["send-done"],
      },
      { caption: "capacity 0" },
    ),
    branchRoutineNode("courier", "courierPickup", {
      activeEvents: ["spawn-courier", "courier-sleep", "receive-meal", "courier-return"],
      completedEvents: ["courier-return"],
    }),
  ];
}
