import type {
  ExplorerEventId,
  ExplorerReplayCursorMode,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { ExplorerFlowNode, ExplorerFlowScene } from "./explorer-flow-scene";
import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function ExplorerFlowView<TEvent extends ExplorerEventId>(
  props: Props<TEvent>,
): JSX.Element {
  return (
    <div class={styles["stageCanvas"]}>
      <div class={styles["flowDemo"]}>
        <div class={styles["flowViewport"]}>
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
        </div>
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
const nodeTextStackOffsetY = 12;

const flowNodeClasses = {
  branch: styles["flowNodeBranch"]!,
  join: styles["flowNodeJoin"]!,
  parent: styles["flowNodeParent"]!,
} as const;

const flowLinkClasses = {
  dependency: styles["flowLinkGroupDependency"]!,
  spawn: styles["flowLinkGroupSpawn"]!,
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
        <path d="M0 0 L9 4.5 L0 9 Z" fill="context-stroke" />
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

        return <FlowNode node={node} status={status} />;
      })}
    </>
  );
}

type FlowNodeStatusValue = ExplorerReplayCursorMode | "done" | null;
type FlowNodeDisplayStatus = Exclude<FlowNodeStatusValue, null> | "pending";

function FlowNode<TEvent extends string>(props: {
  node: ExplorerFlowNode<TEvent>;
  status: FlowNodeStatusValue;
}): JSX.Element {
  const displayStatus = props.status ?? "pending";
  const isActive = props.status === "blocked" || props.status === "running";

  return (
    <g
      class={classes(
        flowNodeClasses[props.node.variant],
        isActive && styles["flowNodeActive"]!,
        props.status === "running" && styles["flowNodeRunning"]!,
        props.status === "blocked" && styles["flowNodeBlocked"]!,
        props.status === "done" && styles["flowNodeDone"]!,
      )}
    >
      <rect
        class={styles["flowNode"]}
        height={props.node.height}
        rx="10"
        width={props.node.width}
        x={props.node.left}
        y={props.node.top}
      />
      <FlowNodeLabel node={props.node} />
      <FlowNodeStatus node={props.node} status={displayStatus} />
    </g>
  );
}

function FlowNodeLabel<TEvent extends string>(props: {
  node: ExplorerFlowNode<TEvent>;
}): JSX.Element {
  const centerX = props.node.left + props.node.width / half;
  const centerY = props.node.centerY - nodeTextStackOffsetY;

  return (
    <text class={styles["flowNodeText"]} x={String(centerX)} y={String(centerY)}>
      {props.node.label}
    </text>
  );
}

function FlowNodeStatus<TEvent extends string>(props: {
  node: ExplorerFlowNode<TEvent>;
  status: FlowNodeDisplayStatus;
}): JSX.Element {
  return (
    <text
      class={classes(
        styles["flowNodeStatus"]!,
        props.status === "blocked" && styles["flowNodeStatusBlocked"]!,
        props.status === "done" && styles["flowNodeStatusDone"]!,
        props.status === "pending" && styles["flowNodeStatusPending"]!,
      )}
      x={String(props.node.left + props.node.width / half)}
      y={String(props.node.centerY + nodeTextStackOffsetY)}
    >
      {props.status}
    </text>
  );
}

function FlowLinks<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.links.map((link) => {
        const mode = readLinkMode(link.activeEvents, props.state);
        const isConsumed = isSpawnLinkConsumed(link, props.scene, props.state);
        const isDependencyTrail = isSettledDependencyLink(link, props.state);

        return (
          <g
            class={classes(
              styles["flowLinkGroup"]!,
              flowLinkClasses[link.variant],
              isConsumed && styles["flowLinkGroupConsumed"]!,
              isDependencyTrail && styles["flowLinkGroupSettledDependency"]!,
              mode === "running" && styles["flowLinkGroupRunning"]!,
              mode === "blocked" && styles["flowLinkGroupBlocked"]!,
            )}
          >
            <path
              class={styles["flowLink"]}
              d={link.path}
              marker-end={`url(#${props.scene.markerId})`}
            />
            <title>{link.label}</title>
          </g>
        );
      })}
    </>
  );
}

function isSpawnLinkConsumed<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  scene: ExplorerFlowScene<TEvent>,
  state: ExplorerReplayState<TEvent>,
): boolean {
  if (link.variant !== "spawn") {
    return false;
  }

  if (readLinkMode(link.activeEvents, state)) {
    return false;
  }

  const targetNode = scene.nodes.find((node) => node.id === link.to);

  return Boolean(targetNode && readNodeStatus(targetNode, state));
}

function isSettledDependencyLink<TEvent extends ExplorerEventId>(
  link: ExplorerFlowScene<TEvent>["links"][number],
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    link.variant === "dependency" &&
    readLinkMode(link.activeEvents, state) === null &&
    includesAny(state.completed, link.activeEvents)
  );
}

function readLinkMode<TEvent extends ExplorerEventId>(
  activeEvents: readonly TEvent[],
  state: ExplorerReplayState<TEvent>,
): ExplorerReplayCursorMode | null {
  const activeCursor = state.cursors.find((cursor) => includesAny(cursor.events, activeEvents));

  if (activeCursor) {
    return activeCursor.mode;
  }

  return null;
}

function includesAny<TEvent extends ExplorerEventId>(
  completedEvents: readonly TEvent[],
  targetEvents: readonly TEvent[],
): boolean {
  return targetEvents.some((event) => completedEvents.includes(event));
}

function readNodeStatus<TEvent extends ExplorerEventId>(
  node: ExplorerFlowNode<TEvent>,
  state: ExplorerReplayState<TEvent>,
): FlowNodeStatusValue {
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

interface Props<TEvent extends ExplorerEventId> {
  code?: JSX.Element;
  codeControls?: JSX.Element;
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}
