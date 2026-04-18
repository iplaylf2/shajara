import type { ExplorerFlowNode, ExplorerFlowScene } from "./explorer-flow-scene";
import type { ExplorerReplayState } from "#/domain/explorer/contract";
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
          <FlowScope scene={props.scene} />
          <FlowNodes scene={props.scene} state={props.state} />
          <FlowLinks scene={props.scene} state={props.state} />
          <FlowStatus scene={props.scene} state={props.state} />
        </svg>
        {props.code}
      </div>
    </div>
  );
}

const EMPTY_LENGTH = 0;
const NODE_TEXT_OFFSET_X = 56;
const NODE_TEXT_OFFSET_Y = 32;

const FLOW_NODE_CLASSES = {
  branch: style("flowNodeBranch"),
  join: style("flowNodeJoin"),
  parent: style("flowNodeParent"),
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

function FlowScope<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
}): JSX.Element {
  return (
    <>
      <rect
        class={styles["flowScope"]}
        height={props.scene.scope.height}
        rx={props.scene.scope.radius}
        width={props.scene.scope.width}
        x={props.scene.scope.left}
        y={props.scene.scope.top}
      />
      <text
        class={styles["flowScopeLabel"]}
        x={props.scene.scope.labelLeft}
        y={props.scene.scope.labelTop}
      >
        {props.scene.scope.label}
      </text>
    </>
  );
}

function FlowNodes<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.nodes.map((node) => (
        <FlowNode
          isActive={hasEvent(node.activeEvents, props.state.active)}
          isDone={includesAny(props.state.completed, node.doneEvents)}
          node={node}
        />
      ))}
    </>
  );
}

function FlowNode<TEvent extends string>(props: {
  isActive: boolean;
  isDone: boolean;
  node: ExplorerFlowNode<TEvent>;
}): JSX.Element {
  return (
    <g
      class={classes(
        FLOW_NODE_CLASSES[props.node.variant],
        props.isActive && style("flowNodeActive"),
        props.isDone && style("flowNodeDone"),
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
        x={offset(props.node.left, NODE_TEXT_OFFSET_X)}
        y={offset(props.node.top, NODE_TEXT_OFFSET_Y)}
      >
        {props.node.label}
      </text>
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
        <path
          class={classes(
            style("flowLink"),
            includesAny(props.state.completed, link.activeEvents) && style("flowLinkActive"),
          )}
          d={link.path}
          marker-end={`url(#${props.scene.markerId})`}
        />
      ))}
    </>
  );
}

function FlowStatus<TEvent extends string>(props: {
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}): JSX.Element {
  return (
    <>
      {props.scene.ticks.map((tick) => (
        <text
          class={classes(
            style("flowTick"),
            includesAny(props.state.completed, tick.visibleEvents) && style("flowTickVisible"),
          )}
          x={tick.left}
          y={tick.top}
        >
          {tick.label}
        </text>
      ))}
      <g class={styles["flowResult"]}>
        <text x={props.scene.result.labelLeft} y={props.scene.result.labelTop}>
          {props.scene.result.label}
        </text>
        <rect
          height={props.scene.result.height}
          rx={props.scene.result.radius}
          width={props.scene.result.width}
          x={props.scene.result.left}
          y={props.scene.result.top}
        />
        <text x={props.scene.result.valueLeft} y={props.scene.result.valueTop}>
          {props.state.result}
        </text>
      </g>
    </>
  );
}

function hasEvent<TEvent extends string>(events: readonly TEvent[], activeEvent: TEvent): boolean {
  return events.includes(activeEvent);
}

function includesAny<TEvent extends string>(
  completedEvents: readonly TEvent[],
  targetEvents: readonly TEvent[],
): boolean {
  return targetEvents.some((event) => completedEvents.includes(event));
}

function offset(value: number, amount: number): string {
  return String(value + amount);
}

function style(name: string): string {
  const className = styles[name];

  if (!className) {
    throw new Error(`Missing explorer style: ${name}`);
  }

  return className;
}

function classes(...values: Array<string | false>): string {
  return values.filter(isClassName).join(" ");
}

function isClassName(value: string | false): value is string {
  return typeof value === "string" && value.length > EMPTY_LENGTH;
}

interface Props<TEvent extends string> {
  code?: JSX.Element;
  scene: ExplorerFlowScene<TEvent>;
  state: ExplorerReplayState<TEvent>;
}
