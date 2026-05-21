import type { ExplorerEventId, ExplorerReplayState } from "#/domain/explorer/contract";
import type { FlowNodeStatusValue } from "./flow-status";
import type { JSX } from "solid-js";
import type { ProcessFlowNode } from "./flow-model";
import { createMemo } from "solid-js";
import { readNodeStatus } from "./flow-status";
import styles from "./styles.module.css";

export function ProcessNode<TEvent extends ExplorerEventId>(props: {
  node: ProcessFlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const status = createMemo(() => readNodeStatus(props.node, props.state));
  const displayStatus = createMemo(() => status() ?? "pending");
  const isActive = createMemo(() => status() === "blocked" || status() === "running");

  return (
    <g
      classList={{
        [flowNodeClasses[props.node.variant]]: true,
        [styles["flowNodeActive"]!]: isActive(),
        [styles["flowNodeBlocked"]!]: status() === "blocked",
        [styles["flowNodeDone"]!]: status() === "done",
        [styles["flowNodePending"]!]: status() === null,
        [styles["flowNodeRunning"]!]: status() === "running",
      }}
    >
      <rect
        class={styles["flowNode"]}
        height={props.node.height}
        rx="10"
        width={props.node.width}
        x={props.node.left}
        y={props.node.top}
      />
      <ProcessNodeLabel node={props.node} />
      <ProcessNodeStatus node={props.node} status={displayStatus()} />
    </g>
  );
}

type ProcessNodeDisplayStatus = Exclude<FlowNodeStatusValue, null> | "pending";

const HALF = 2;
const NODE_TEXT_STACK_OFFSET_Y = 12;

const flowNodeClasses = {
  caller: styles["flowNodeCaller"]!,
  coordinator: styles["flowNodeCoordinator"]!,
  worker: styles["flowNodeWorker"]!,
} as const;

function ProcessNodeLabel<TEvent extends ExplorerEventId>(props: {
  node: ProcessFlowNode<TEvent>;
}): JSX.Element {
  const centerX = props.node.left + props.node.width / HALF;
  const centerY = props.node.centerY - NODE_TEXT_STACK_OFFSET_Y;

  return (
    <text class={styles["flowNodeText"]} x={String(centerX)} y={String(centerY)}>
      {props.node.label}
    </text>
  );
}

function ProcessNodeStatus<TEvent extends ExplorerEventId>(props: {
  node: ProcessFlowNode<TEvent>;
  status: ProcessNodeDisplayStatus;
}): JSX.Element {
  return (
    <text
      classList={{
        [styles["flowNodeStatus"]!]: true,
        [styles["flowNodeStatusBlocked"]!]: props.status === "blocked",
        [styles["flowNodeStatusDone"]!]: props.status === "done",
        [styles["flowNodeStatusPending"]!]: props.status === "pending",
        [styles["flowNodeStatusRunning"]!]: props.status === "running",
      }}
      x={String(props.node.left + props.node.width / HALF)}
      y={String(props.node.centerY + NODE_TEXT_STACK_OFFSET_Y)}
    >
      {props.status}
    </text>
  );
}
