import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import { boundedChannelDemo, createBoundedChannelDemoCode } from "./runtime";
import {
  branchRoutineNode,
  channelNode,
  dataLink,
  parentRoutineNode,
  spawnLink,
} from "#/domain/explorer/examples-kit";
import type { BoundedChannelDemoEvent } from "./runtime";

export const boundedChannelExample = {
  descriptionKey: "explorer.examples.bounded-channel.description",
  guideKeys: [
    "explorer.examples.bounded-channel.guide.buffer",
    "explorer.examples.bounded-channel.guide.waiter",
    "explorer.examples.bounded-channel.guide.receiver",
  ],
  id: "bounded-channel",
  stage: {
    code: createBoundedChannelDemoCode(),
    flow: createBoundedChannelFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => boundedChannelDemo,
      },
    },
  },
  titleKey: "explorer.examples.bounded-channel.title",
} as const satisfies ExplorerExample<BoundedChannelDemoEvent, number, string>;

function createBoundedChannelFlow(): ExplorerFlowGraph<BoundedChannelDemoEvent> {
  return {
    links: createBoundedChannelFlowLinks(),
    nodes: createBoundedChannelFlowNodes(),
  };
}

function createBoundedChannelFlowLinks(): ExplorerFlowGraph<BoundedChannelDemoEvent>["links"] {
  return [
    spawnLink("root", "worker", "spawn(writeBatches)", ["spawn-worker"]),
    dataLink("root", "channel", "send enters channel", [
      "send-first",
      "send-second",
      "second-sent",
      "send-third",
    ]),
    dataLink("channel", "worker", "receive takes value", [
      "receive-first",
      "receive-second",
      "receive-third",
    ]),
  ];
}

function createBoundedChannelFlowNodes(): ExplorerFlowGraph<BoundedChannelDemoEvent>["nodes"] {
  return [createQueueBatchesNode(), createChannelNode(), createWriteBatchesNode()];
}

function createQueueBatchesNode() {
  return parentRoutineNode("root", "queueBatches", {
    activeEvents: [
      "routine",
      "channel-open",
      "spawn-worker",
      "send-first",
      "send-second",
      "second-sent",
      "sender-sleep",
      "send-third",
      "done-return",
      "done",
    ],
    completedEvents: ["done"],
  });
}

function createChannelNode() {
  return channelNode(
    "channel",
    "channel",
    {
      activeEvents: [
        "channel-open",
        "send-first",
        "send-second",
        "receive-first",
        "second-sent",
        "receive-second",
        "sender-sleep",
        "receive-third",
        "send-third",
        "done-return",
        "done",
      ],
      completedEvents: ["done"],
    },
    {
      defaultLabel: "0/1",
      kind: "metered",
      overloadEvents: ["send-second"],
      states: [
        { events: ["done"], kind: "completed", label: "0/1" },
        { events: ["send-first", "send-second", "send-third"], kind: "active", label: "1/1" },
        {
          events: ["receive-first", "receive-second", "receive-third"],
          kind: "active",
          label: "0/1",
        },
        { events: ["send-first", "second-sent"], kind: "completed", label: "1/1" },
      ],
    },
  );
}

function createWriteBatchesNode() {
  return branchRoutineNode("worker", "writeBatches", {
    activeEvents: [
      "spawn-worker",
      "worker-sleep",
      "receive-first",
      "receive-second",
      "receive-third",
      "worker-return",
    ],
    completedEvents: ["worker-return"],
  });
}
