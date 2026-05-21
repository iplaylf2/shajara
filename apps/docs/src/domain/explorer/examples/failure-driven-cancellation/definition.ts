import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  callerNode,
  coordinatorNode,
  scopeNode,
  spawnLink,
  workerNode,
} from "#/domain/explorer/examples-kit";
import { createFailureDrivenCancellationDemoCode, failureDrivenCancellationDemo } from "./runtime";
import type { FailureDrivenCancellationDemoEvent } from "./runtime";

export const failureDrivenCancellationExample = {
  descriptionKey: "explorer.examples.failure-driven-cancellation.description",
  guideKeys: [
    "explorer.examples.failure-driven-cancellation.guide.branch",
    "explorer.examples.failure-driven-cancellation.guide.scope",
    "explorer.examples.failure-driven-cancellation.guide.cancel",
    "explorer.examples.failure-driven-cancellation.guide.surface",
  ],
  id: "failure-driven-cancellation",
  stage: {
    code: createFailureDrivenCancellationDemoCode(),
    flow: createFailureDrivenCancellationFlow(),
    replay: {
      replayDelayMs: 1300,
      runtime: {
        createProgram: () => failureDrivenCancellationDemo,
      },
    },
  },
  titleKey: "explorer.examples.failure-driven-cancellation.title",
} as const satisfies ExplorerExample<FailureDrivenCancellationDemoEvent, string, string>;

function createFailureDrivenCancellationFlow(): ExplorerFlow<FailureDrivenCancellationDemoEvent> {
  return {
    links: createFailureDrivenCancellationFlowLinks(),
    nodes: createFailureDrivenCancellationFlowNodes(),
  };
}

function createFailureDrivenCancellationFlowLinks(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["links"] {
  return [
    spawnLink("root", "campaign", "branch(sendCampaign)", ["launch-scope"]),
    spawnLink("campaign", "email", "spawn(sendEmailBatch)", ["launch-email"]),
    spawnLink("campaign", "audience", "spawn(refreshAudience)", ["launch-audience"]),
  ];
}

function createFailureDrivenCancellationFlowNodes(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"] {
  return [
    createRootNode(),
    createCampaignScopeNode(),
    createCampaignNode(),
    createEmailNode(),
    createAudienceNode(),
  ];
}

function createRootNode(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"][number] {
  return callerNode("root", "launchCampaign", {
    activeEvents: [
      "function-open",
      "branch-open",
      "launch-scope",
      "scope-wait-root",
      "failure-surfaced",
      "done",
    ],
    completedEvents: ["done"],
  });
}

function createCampaignScopeNode(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"][number] {
  return scopeNode("campaign-scope", "sendCampaign scope", ["campaign", "email", "audience"], {
    activeEvents: [
      "launch-scope",
      "launch-email",
      "launch-audience",
      "email-sleep",
      "audience-sleep",
      "campaign-sleep",
      "scope-wait-root",
    ],
    closedEvents: ["scope-closed"],
    completedEvents: ["scope-closed"],
  });
}

function createCampaignNode(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"][number] {
  return coordinatorNode("campaign", "sendCampaign", {
    activeEvents: [
      "launch-scope",
      "launch-email",
      "spawn-email",
      "launch-audience",
      "spawn-audience",
      "campaign-sleep",
      "campaign-cancel",
    ],
    completedEvents: ["campaign-cancel"],
  });
}

function createEmailNode(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"][number] {
  return workerNode("email", "sendEmailBatch", {
    activeEvents: ["spawn-email", "email-sleep", "email-throw"],
    completedEvents: ["email-throw"],
  });
}

function createAudienceNode(): ExplorerFlow<FailureDrivenCancellationDemoEvent>["nodes"][number] {
  return workerNode("audience", "refreshAudience", {
    activeEvents: ["spawn-audience", "audience-sleep", "audience-cancel"],
    completedEvents: ["audience-cancel"],
  });
}
