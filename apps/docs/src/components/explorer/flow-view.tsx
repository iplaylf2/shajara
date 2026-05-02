import type { ExplorerEventId, ExplorerReplayState } from "#/domain/explorer/contract";
import type { FlowNode, FlowScene } from "./flow-model";
import {
  isInterruptedWaitLink,
  isSettledDataLink,
  isSettledWaitLink,
  isSpawnLinkConsumed,
  readLinkMode,
  readNodeStatus,
} from "./flow-status";
import type { ChannelDataBlockedAnchor } from "./channel-data-link";
import { ChannelDataLink } from "./channel-data-link";
import { ChannelNode } from "./channel-node";
import type { FlowNodeStatusValue } from "./flow-status";
import { FutureNode } from "./future-node";
import type { JSX } from "solid-js";
import { ScopeGroups } from "./scope-group";
import { createMemo } from "solid-js";
import styles from "./styles.module.css";

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
            <ScopeGroups scene={props.scene} state={props.state} />
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

const HALF = 2;
const FLOW_LINK_INTERRUPT_MARK_RADIUS = 4;
const NODE_TEXT_STACK_OFFSET_Y = 12;

const flowNodeClasses = {
  caller: styles["flowNodeCaller"]!,
  coordinator: styles["flowNodeCoordinator"]!,
  worker: styles["flowNodeWorker"]!,
} as const;

const flowLinkClasses = {
  data: styles["flowLinkGroupData"]!,
  spawn: styles["flowLinkGroupSpawn"]!,
  wait: styles["flowLinkGroupWait"]!,
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
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.nodes.map((node) => (
        <FlowNode node={node} state={props.state} />
      ))}
    </>
  );
}

type FlowNodeDisplayStatus = Exclude<FlowNodeStatusValue, null> | "pending";

function FlowNode<TEvent extends string>(props: {
  node: FlowNode<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  if (props.node.variant === "channel") {
    return <ChannelNode node={props.node} state={props.state} />;
  }

  if (props.node.variant === "future") {
    return <FutureNode node={props.node} state={props.state} />;
  }

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
      <FlowNodeLabel node={props.node} />
      <FlowNodeStatus node={props.node} status={displayStatus()} />
    </g>
  );
}

function FlowNodeLabel<TEvent extends string>(props: { node: FlowNode<TEvent> }): JSX.Element {
  const centerX = props.node.left + props.node.width / HALF;
  const centerY = props.node.centerY - NODE_TEXT_STACK_OFFSET_Y;

  return (
    <text class={styles["flowNodeText"]} x={String(centerX)} y={String(centerY)}>
      {props.node.label}
    </text>
  );
}

function FlowNodeStatus<TEvent extends string>(props: {
  node: FlowNode<TEvent>;
  status: FlowNodeDisplayStatus;
}): JSX.Element {
  return (
    <text
      classList={{
        [styles["flowNodeStatus"]!]: true,
        [styles["flowNodeStatusBlocked"]!]: props.status === "blocked",
        [styles["flowNodeStatusDone"]!]: props.status === "done",
        [styles["flowNodeStatusPending"]!]: props.status === "pending",
      }}
      x={String(props.node.left + props.node.width / HALF)}
      y={String(props.node.centerY + NODE_TEXT_STACK_OFFSET_Y)}
    >
      {props.status}
    </text>
  );
}

function FlowLinks<TEvent extends string>(props: {
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.links.map((link) => (
        <FlowLink link={link} scene={props.scene} state={props.state} />
      ))}
    </>
  );
}

function FlowLink<TEvent extends string>(props: {
  link: FlowScene<TEvent>["links"][number];
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const channelData = readChannelDataLink(props.link, props.scene);
  if (channelData) {
    return (
      <ChannelDataLink
        blockedAnchor={channelData.blockedAnchor}
        link={props.link}
        state={props.state}
      />
    );
  }

  return <GenericFlowLink link={props.link} scene={props.scene} state={props.state} />;
}

function GenericFlowLink<TEvent extends string>(props: {
  link: FlowScene<TEvent>["links"][number];
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  const mode = createMemo(() => readLinkMode(props.link.activeEvents, props.state));
  const isConsumed = createMemo(() => isSpawnLinkConsumed(props.link, props.scene, props.state));
  const isDataTrail = createMemo(() => isSettledDataLink(props.link, props.state));
  const isInterruptedWaitTrail = createMemo(() => isInterruptedWaitLink(props.link, props.state));
  const isWaitTrail = createMemo(
    () => !isInterruptedWaitTrail() && isSettledWaitLink(props.link, props.state),
  );

  return (
    <g
      classList={{
        [flowLinkClasses[props.link.variant]]: true,
        [styles["flowLinkGroup"]!]: true,
        [styles["flowLinkGroupBlocked"]!]: mode() === "blocked",
        [styles["flowLinkGroupConsumed"]!]: isConsumed(),
        [styles["flowLinkGroupInterruptedWait"]!]: isInterruptedWaitTrail(),
        [styles["flowLinkGroupRunning"]!]: mode() === "running",
        [styles["flowLinkGroupSettledData"]!]: isDataTrail(),
        [styles["flowLinkGroupSettledWait"]!]: isWaitTrail(),
      }}
    >
      <path
        class={styles["flowLink"]}
        d={props.link.path}
        marker-end={`url(#${props.scene.markerId})`}
      />
      {isInterruptedWaitTrail() && (
        <path
          class={styles["flowLinkInterruptMark"]}
          d={`M${props.link.labelX - FLOW_LINK_INTERRUPT_MARK_RADIUS} ${props.link.labelY - FLOW_LINK_INTERRUPT_MARK_RADIUS} L${props.link.labelX + FLOW_LINK_INTERRUPT_MARK_RADIUS} ${props.link.labelY + FLOW_LINK_INTERRUPT_MARK_RADIUS} M${props.link.labelX + FLOW_LINK_INTERRUPT_MARK_RADIUS} ${props.link.labelY - FLOW_LINK_INTERRUPT_MARK_RADIUS} L${props.link.labelX - FLOW_LINK_INTERRUPT_MARK_RADIUS} ${props.link.labelY + FLOW_LINK_INTERRUPT_MARK_RADIUS}`}
        />
      )}
      <FlowLinkLabel link={props.link} />
      <title>{props.link.label}</title>
    </g>
  );
}

function readChannelDataLink<TEvent extends string>(
  link: FlowScene<TEvent>["links"][number],
  scene: FlowScene<TEvent>,
): ChannelDataLinkInfo | null {
  if (link.variant !== "data") {
    return null;
  }

  const fromNode = scene.nodes.find((node) => node.id === link.from);
  const toNode = scene.nodes.find((node) => node.id === link.to);

  if (toNode?.variant === "channel") {
    return { blockedAnchor: "end" };
  }

  if (fromNode?.variant === "channel") {
    return { blockedAnchor: "start" };
  }

  return null;
}

function FlowLinkLabel<TEvent extends string>(props: {
  link: FlowScene<TEvent>["links"][number];
}): JSX.Element {
  if (props.link.displayLabel.kind === "hidden") {
    return <></>;
  }

  return (
    <text
      class={styles["flowLinkLabel"]}
      x={String(props.link.labelX)}
      y={String(props.link.labelY)}
    >
      {props.link.displayLabel.text}
    </text>
  );
}

interface Props<TEvent extends ExplorerEventId> {
  code?: JSX.Element;
  codeControls?: JSX.Element;
  scene: FlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}

interface ChannelDataLinkInfo {
  blockedAnchor: ChannelDataBlockedAnchor;
}
