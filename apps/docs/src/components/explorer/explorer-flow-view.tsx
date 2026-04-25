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
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={props.scene.viewBox}
        >
          <FlowArrowMarker markerId={props.scene.markerId} />
          <FlowLinks scene={props.scene} state={props.state} />
          <FlowNodes scene={props.scene} state={props.state} />
        </svg>
        <div class={styles["codePanel"]}>
          {props.codeControls}
          {props.code}
        </div>
      </div>
    </div>
  );
}

const emptyLength = 0;
const half = 2;
const nodeStatusOffsetY = 20;
const nodeTextOffsetY = -7;

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
        markerHeight="9"
        markerWidth="9"
        orient="auto"
        refX="8"
        refY="4.5"
        viewBox="0 0 9 9"
      >
        <path d="M0 0 L9 4.5 L0 9 Z" fill="#526a86" />
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
        height={props.node.height}
        rx="12"
        width={props.node.width}
        x={props.node.left}
        y={props.node.top}
      />
      <text
        class={styles["flowNodeText"]}
        x={String(props.node.left + props.node.width / half)}
        y={String(props.node.top + props.node.height / half + nodeTextOffsetY)}
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
          x={String(props.node.left + props.node.width / half)}
          y={String(props.node.top + props.node.height / half + nodeStatusOffsetY)}
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
          <title>{link.label}</title>
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

function classes(...values: (string | false)[]): string {
  return values.filter(isClassName).join(" ");
}

function isClassName(value: string | false): value is string {
  return typeof value === "string" && value.length > emptyLength;
}

interface Props<TEvent extends string> {
  code?: JSX.Element;
  codeControls?: JSX.Element;
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}
