import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  channelNode,
  dataLink,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { bufferedBackpressureDemo, createBufferedBackpressureDemoCode } from "./runtime";
import type { BufferedBackpressureDemoEvent } from "./runtime";

export const bufferedBackpressureExample = {
  descriptionKey: "explorer.examples.buffered-backpressure.description",
  guideKeys: [
    "explorer.examples.buffered-backpressure.guide.buffer",
    "explorer.examples.buffered-backpressure.guide.backpressure",
  ],
  id: "buffered-backpressure",
  stage: {
    code: createBufferedBackpressureDemoCode(),
    flow: createBufferedBackpressureFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => bufferedBackpressureDemo,
      },
    },
  },
  titleKey: "explorer.examples.buffered-backpressure.title",
} as const satisfies ExplorerExample<BufferedBackpressureDemoEvent, number, string>;

function createBufferedBackpressureFlow(): ExplorerFlowGraph<BufferedBackpressureDemoEvent> {
  return {
    links: createBufferedBackpressureFlowLinks(),
    nodes: createBufferedBackpressureFlowNodes(),
  };
}

function createBufferedBackpressureFlowLinks(): ExplorerFlowGraph<BufferedBackpressureDemoEvent>["links"] {
  return [
    spawnLink("root", "worker", "spawn(writeBatches)", ["spawn-worker"]),
    dataLink("root", "channel", "buffered sends", ["send-first", "send-second", "third-sent"]),
    waitLink("channel", "root", "send waits for capacity", {
      activeEvents: ["send-third"],
    }),
    dataLink("channel", "worker", "received batches", [
      "receive-first",
      "receive-second",
      "receive-third",
    ]),
  ];
}

function createBufferedBackpressureFlowNodes(): ExplorerFlowGraph<BufferedBackpressureDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "queueBatches", {
      activeEvents: [
        "routine",
        "channel-open",
        "spawn-worker",
        "send-first",
        "send-second",
        "send-third",
        "third-sent",
        "done",
      ],
      completedEvents: ["done"],
    }),
    channelNode(
      "channel",
      "channel",
      {
        activeEvents: [
          "channel-open",
          "send-first",
          "send-second",
          "send-third",
          "receive-first",
          "third-sent",
        ],
        completedEvents: ["receive-third"],
      },
      {
        caption: "capacity 2",
        overloadEvents: ["send-third"],
      },
    ),
    branchRoutineNode("worker", "writeBatches", {
      activeEvents: [
        "spawn-worker",
        "worker-sleep",
        "receive-first",
        "receive-second",
        "receive-third",
        "worker-return",
      ],
      completedEvents: ["worker-return"],
    }),
  ];
}
