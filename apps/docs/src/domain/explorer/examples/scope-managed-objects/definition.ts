import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  callerNode,
  channelNode,
  dataLink,
  futureNode,
  scopeNode,
  spawnLink,
  waitLink,
  workerNode,
} from "#/domain/explorer/examples-kit";
import { createScopeManagedObjectsDemoCode, scopeManagedObjectsDemo } from "./runtime";
import type { ScopeManagedObjectsDemoEvent } from "./runtime";

export const scopeManagedObjectsExample = {
  descriptionKey: "explorer.examples.scope-managed-objects.description",
  guideKeys: [
    "explorer.examples.scope-managed-objects.guide.boundary",
    "explorer.examples.scope-managed-objects.guide.objects",
    "explorer.examples.scope-managed-objects.guide.close",
    "explorer.examples.scope-managed-objects.guide.observe",
  ],
  id: "scope-managed-objects",
  stage: {
    code: createScopeManagedObjectsDemoCode(),
    flow: createScopeManagedObjectsFlow(),
    replay: {
      replayDelayMs: 1300,
      runtime: {
        createProgram: () => scopeManagedObjectsDemo,
      },
    },
  },
  titleKey: "explorer.examples.scope-managed-objects.title",
} as const satisfies ExplorerExample<ScopeManagedObjectsDemoEvent, string, string>;

function createScopeManagedObjectsFlow(): ExplorerFlow<ScopeManagedObjectsDemoEvent> {
  return {
    links: createScopeManagedObjectsFlowLinks(),
    nodes: createScopeManagedObjectsFlowNodes(),
  };
}

function createScopeManagedObjectsFlowLinks(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["links"] {
  return [
    spawnLink("root", "child", "branch(openSession)", ["launch-scope"]),
    waitLink("child", "root", "branch waits for openSession", {
      activeEvents: ["scope-wait-root"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    dataLink("child", "root", "ticket, updates", ["objects-returned"]),
    waitLink("ticket", "root", "wait(ticket)", {
      activeEvents: ["wait-ticket"],
      displayLabel: { kind: "hidden" },
      interruption: { events: ["ticket-caught"], kind: "interruptible" },
    }),
    waitLink("updates", "root", "tryReceive(updates)", {
      activeEvents: ["receive-updates"],
      displayLabel: { kind: "hidden" },
      interruption: { events: ["updates-caught"], kind: "interruptible" },
    }),
  ];
}

function createScopeManagedObjectsFlowNodes(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"] {
  return [
    createRootNode(),
    createSessionScopeNode(),
    createChildNode(),
    createTicketNode(),
    createUpdatesNode(),
  ];
}

function createRootNode(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"][number] {
  return callerNode("root", "resumeCheckout", {
    activeEvents: [
      "function-open",
      "branch-open",
      "launch-scope",
      "scope-wait-root",
      "objects-returned",
      "after-branch-sleep",
      "wait-ticket",
      "ticket-caught",
      "object-sleep",
      "receive-updates",
      "updates-caught",
      "return-result",
      "done",
    ],
    completedEvents: ["done"],
  });
}

function createSessionScopeNode(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"][number] {
  return scopeNode("session-scope", "openSession scope", ["child", "ticket", "updates"], {
    activeEvents: [
      "launch-scope",
      "future-open",
      "channel-open",
      "session-sleep",
      "return-objects",
      "scope-closing",
      "scope-wait-root",
    ],
    closedEvents: ["scope-closed"],
    closingEvents: ["scope-closing"],
    completedEvents: ["scope-closed"],
  });
}

function createChildNode(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"][number] {
  return workerNode("child", "openSession", {
    activeEvents: [
      "launch-scope",
      "future-open",
      "channel-open",
      "session-sleep",
      "return-objects",
    ],
    completedEvents: ["return-objects"],
  });
}

function createTicketNode(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"][number] {
  return futureNode("ticket", "ticket", {
    activeEvents: [
      "future-open",
      "channel-open",
      "session-sleep",
      "objects-returned",
      "wait-ticket",
    ],
    completedEvents: ["ticket-canceled"],
  });
}

function createUpdatesNode(): ExplorerFlow<ScopeManagedObjectsDemoEvent>["nodes"][number] {
  return channelNode(
    "updates",
    "updates",
    {
      activeEvents: ["channel-open", "session-sleep", "objects-returned", "receive-updates"],
      completedEvents: ["updates-revoked"],
      direction: "left",
    },
    {
      defaultLabel: "open",
      kind: "metered",
      overloadEvents: [],
      states: [{ events: ["updates-revoked"], kind: "completed", label: "revoked" }],
    },
  );
}
