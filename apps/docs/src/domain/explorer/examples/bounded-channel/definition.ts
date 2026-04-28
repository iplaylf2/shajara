import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
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
    "explorer.examples.bounded-channel.guide.channel",
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

function createBoundedChannelFlow(): ExplorerFlow<BoundedChannelDemoEvent> {
  return {
    links: createBoundedChannelFlowLinks(),
    nodes: createBoundedChannelFlowNodes(),
  };
}

function createBoundedChannelFlowLinks(): ExplorerFlow<BoundedChannelDemoEvent>["links"] {
  return [
    spawnLink("root", "worker", "spawn(writeBatches)", ["spawn-worker"]),
    dataLink("root", "channel", "send enters channel", [
      "send-first",
      "send-second",
      "second-sent",
      "send-third",
      "third-sent",
      "send-fourth",
    ]),
    dataLink("channel", "worker", "receive takes value", [
      "receive-first",
      "receive-second",
      "receive-third",
      "receive-fourth",
    ]),
  ];
}

function createBoundedChannelFlowNodes(): ExplorerFlow<BoundedChannelDemoEvent>["nodes"] {
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
      "send-third",
      "third-sent",
      "sender-sleep",
      "send-fourth",
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
        "worker-sleep",
        "second-sent",
        "send-third",
        "receive-second",
        "third-sent",
        "receive-third",
        "sender-sleep",
        "receive-fourth",
        "send-fourth",
        "done-return",
        "done",
      ],
      completedEvents: ["done"],
    },
    {
      defaultLabel: "0/1",
      kind: "metered",
      overloadEvents: ["send-second", "send-third"],
      states: [
        { events: ["done"], kind: "completed", label: "0/1" },
        {
          events: ["send-first", "send-second", "send-third", "send-fourth"],
          kind: "active",
          label: "1/1",
        },
        {
          events: ["receive-first", "receive-second", "receive-third", "receive-fourth"],
          kind: "active",
          label: "0/1",
        },
        {
          events: ["send-first", "worker-sleep", "second-sent", "third-sent", "sender-sleep"],
          kind: "completed",
          label: "1/1",
        },
      ],
    },
  );
}

function createWriteBatchesNode() {
  return branchRoutineNode("worker", "writeBatches", {
    activeEvents: [
      "spawn-worker",
      "receive-first",
      "worker-sleep",
      "receive-second",
      "receive-third",
      "receive-fourth",
      "worker-return",
    ],
    completedEvents: ["worker-return"],
  });
}
