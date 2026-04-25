import type { ExplorerFlowNode, ExplorerFlowScene } from "./explorer-flow-scene";
import type { ExplorerReplayCursor, ExplorerReplayState } from "#/domain/explorer/contract";
import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerFlowView<TEvent extends string>(props: Props<TEvent>): JSX.Element {
  return (
    <div class={styles["stageCanvas"]}>
      <div class={styles["flowDemo"]}>
        <svg
          aria-label={props.scene.ariaLabel}
          class={styles["flowSvg"]}
          role="img"
          viewBox={props.scene.viewBox}
        >
          <FlowArrowMarker markerId={props.scene.markerId} />
          <FlowLinks scene={props.scene} state={props.state} />
          <FlowNodes scene={props.scene} state={props.state} />
        </svg>
        {props.code}
      </div>
    </div>
  );
}

const emptyLength = 0;
const nodeTextOffsetX = 56;
const nodeStatusOffsetY = 41;
const nodeTextOffsetY = 24;

const flowNodeClasses = {
  branch: styles["flowNodeBranch"]!,
  join: styles["flowNodeJoin"]!,
  parent: styles["flowNodeParent"]!,
} as const;

function FlowArrowMarker(props: { markerId: string }): JSX.Element {
  return (
    <defs>
      <marker
        id={props.markerId}
        markerHeight="8"
        markerWidth="8"
        orient="auto"
        refX="7"
        refY="4"
        viewBox="0 0 8 8"
      >
        <path d="M0 0 L8 4 L0 8 Z" fill="#526a86" />
      </marker>
    </defs>
  );
}

function FlowNodes<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.nodes.map((node) => {
        const status = readNodeStatus(node, props.state);

        return (
          <FlowNode
            isActive={status === "blocked" || status === "running"}
            node={node}
            status={status}
          />
        );
      })}
    </>
  );
}

type FlowNodeStatus = ExplorerReplayCursor["mode"] | "done" | null;

function FlowNode<TEvent extends string>(props: {
  isActive: boolean;
  node: ExplorerFlowNode<TEvent>;
  status: FlowNodeStatus;
}): JSX.Element {
  return (
    <g
      class={classes(
        flowNodeClasses[props.node.variant],
        props.isActive && styles["flowNodeActive"]!,
        props.status === "done" && styles["flowNodeDone"]!,
      )}
    >
      <rect
        class={styles["flowNode"]}
        height="52"
        rx="10"
        width="112"
        x={props.node.left}
        y={props.node.top}
      />
      <text
        class={styles["flowNodeText"]}
        x={offset(props.node.left, nodeTextOffsetX)}
        y={offset(props.node.top, nodeTextOffsetY)}
      >
        {props.node.label}
      </text>
      {props.status && (
        <text
          class={classes(
            styles["flowNodeStatus"]!,
            props.status === "blocked" && styles["flowNodeStatusBlocked"]!,
            props.status === "done" && styles["flowNodeStatusDone"]!,
          )}
          x={offset(props.node.left, nodeTextOffsetX)}
          y={offset(props.node.top, nodeStatusOffsetY)}
        >
          {props.status}
        </text>
      )}
    </g>
  );
}

function FlowLinks<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.links.map((link) => (
        <g
          class={classes(
            styles["flowLinkGroup"]!,
            includesAny(props.state.active, link.activeEvents) && styles["flowLinkGroupActive"]!,
          )}
        >
          <path
            class={styles["flowLink"]}
            d={link.path}
            marker-end={`url(#${props.scene.markerId})`}
          />
          <text class={styles["flowLinkLabel"]} x={link.labelLeft} y={link.labelTop}>
            {link.label}
          </text>
        </g>
      ))}
    </>
  );
}

function includesAny<TEvent extends string>(
  completedEvents: readonly TEvent[],
  targetEvents: readonly TEvent[],
): boolean {
  return targetEvents.some((event) => completedEvents.includes(event));
}

function readNodeStatus<TEvent extends string>(
  node: ExplorerFlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FlowNodeStatus {
  if (includesAny(state.completed, node.completedEvents)) {
    return "done";
  }

  const activeCursor = state.cursors.find(
    (cursor) =>
      node.statusRoutineIds.includes(cursor.routineId) &&
      includesAny(cursor.events, node.activeEvents),
  );

  if (activeCursor) {
    return activeCursor.mode;
  }

  return null;
}

function offset(value: number, amount: number): string {
  return String(value + amount);
}

function classes(...values: (string | false)[]): string {
  return values.filter(isClassName).join(" ");
}

function isClassName(value: string | false): value is string {
  return typeof value === "string" && value.length > emptyLength;
}

interface Props<TEvent extends string> {
  code?: JSX.Element;
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}
