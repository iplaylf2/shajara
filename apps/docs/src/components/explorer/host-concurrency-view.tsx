import type { HostConcurrencyEvent, HostTrace } from "#/domain/explorer/host-concurrency/trace";
import type { JSX } from "solid-js";
import styles from "./explorer.module.css";

export function HostConcurrencyView(props: Props): JSX.Element {
  return (
    <div class={styles["stageCanvas"]}>
      <div class={styles["hostConcurrencyDemo"]}>
        <HostConcurrencySvg state={props.state} />
        {props.code}
      </div>
    </div>
  );
}

const EMPTY_LENGTH = 0;
const NODE_TEXT_OFFSET_X = 56;
const NODE_TEXT_OFFSET_Y = 32;

const HOST_CONCURRENCY_NODE_CLASSES = {
  branch: style("hostConcurrencyNodeBranch"),
  join: style("hostConcurrencyNodeJoin"),
  parent: style("hostConcurrencyNodeParent"),
} as const;

function HostConcurrencySvg(props: { state: HostTrace }): JSX.Element {
  return (
    <svg
      aria-label="@shajara/host code-driven structured concurrency animation"
      class={styles["hostConcurrencySvg"]}
      role="img"
      viewBox="0 0 760 330"
    >
      <HostArrowMarker />
      <HostScope />
      <HostNodes state={props.state} />
      <HostLinks state={props.state} />
      <HostStatus state={props.state} />
    </svg>
  );
}

function HostArrowMarker(): JSX.Element {
  return (
    <defs>
      <marker
        id="host-concurrency-arrow"
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

function HostScope(): JSX.Element {
  return (
    <>
      <rect class={styles["hostConcurrencyScope"]} height="252" rx="16" width="638" x="62" y="38" />
      <text class={styles["hostConcurrencyScopeLabel"]} x="86" y="72">
        function* loadPage()
      </text>
    </>
  );
}

function HostNodes(props: { state: HostTrace }): JSX.Element {
  return (
    <>
      <HostConcurrencyNode
        isActive={props.state.active === "routine"}
        isDone={isDone(props.state, "routine")}
        label="root routine"
        left="98"
        top="138"
        variant="parent"
      />
      <HostConcurrencyNode
        isActive={props.state.active === "header-start"}
        isDone={isDone(props.state, "header-done")}
        label="loadHeader"
        left="322"
        top="96"
        variant="branch"
      />
      <HostConcurrencyNode
        isActive={props.state.active === "sidebar-start"}
        isDone={isDone(props.state, "sidebar-done")}
        label="loadSidebar"
        left="322"
        top="188"
        variant="branch"
      />
      <HostConcurrencyNode
        isActive={isWaiting(props.state)}
        isDone={isDone(props.state, "done")}
        label="wait results"
        left="574"
        top="138"
        variant="join"
      />
    </>
  );
}

function HostConcurrencyNode(props: HostConcurrencyNodeProps): JSX.Element {
  return (
    <g
      class={classes(
        HOST_CONCURRENCY_NODE_CLASSES[props.variant],
        props.isActive && style("hostConcurrencyNodeActive"),
        props.isDone && style("hostConcurrencyNodeDone"),
      )}
    >
      <rect
        class={styles["hostConcurrencyNode"]}
        height="52"
        rx="10"
        width="112"
        x={props.left}
        y={props.top}
      />
      <text
        class={styles["hostConcurrencyNodeText"]}
        x={offset(props.left, NODE_TEXT_OFFSET_X)}
        y={offset(props.top, NODE_TEXT_OFFSET_Y)}
      >
        {props.label}
      </text>
    </g>
  );
}

function HostLinks(props: { state: HostTrace }): JSX.Element {
  return (
    <>
      <HostConcurrencyLink
        isActive={isDone(props.state, "spawn-header")}
        path="M210 156 C248 116 276 112 322 116"
      />
      <HostConcurrencyLink
        isActive={isDone(props.state, "spawn-sidebar")}
        path="M210 174 C248 214 276 220 322 208"
      />
      <HostConcurrencyLink
        isActive={isDone(props.state, "wait-header")}
        path="M434 116 C494 112 526 128 574 156"
      />
      <HostConcurrencyLink
        isActive={isDone(props.state, "wait-sidebar")}
        path="M434 208 C494 212 526 194 574 174"
      />
    </>
  );
}

function HostConcurrencyLink(props: HostConcurrencyLinkProps): JSX.Element {
  return (
    <path
      class={classes(
        style("hostConcurrencyLink"),
        props.isActive && style("hostConcurrencyLinkActive"),
      )}
      d={props.path}
      marker-end="url(#host-concurrency-arrow)"
    />
  );
}

function HostStatus(props: { state: HostTrace }): JSX.Element {
  return (
    <>
      <HostConcurrencyTick isVisible={isDone(props.state, "header-done")} left="378" top="176" />
      <HostConcurrencyTick isVisible={isDone(props.state, "sidebar-done")} left="378" top="266" />
      <g class={styles["hostConcurrencyResult"]}>
        <text x="96" y="276">
          result
        </text>
        <rect height="28" rx="8" width="186" x="148" y="258" />
        <text x="166" y="277">
          {props.state.result}
        </text>
      </g>
    </>
  );
}

function HostConcurrencyTick(props: HostConcurrencyTickProps): JSX.Element {
  return (
    <text
      class={classes(
        style("hostConcurrencyTick"),
        props.isVisible && style("hostConcurrencyTickVisible"),
      )}
      x={props.left}
      y={props.top}
    >
      done
    </text>
  );
}

function isDone(state: HostTrace, event: HostConcurrencyEvent): boolean {
  return state.completed.includes(event);
}

function isWaiting(state: HostTrace): boolean {
  return (
    state.active === "wait" || state.active === "wait-header" || state.active === "wait-sidebar"
  );
}

function offset(value: string, amount: number): string {
  return String(Number(value) + amount);
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

interface HostConcurrencyNodeProps {
  isActive: boolean;
  isDone: boolean;
  label: string;
  left: string;
  top: string;
  variant: "branch" | "join" | "parent";
}

interface HostConcurrencyLinkProps {
  isActive: boolean;
  path: string;
}

interface HostConcurrencyTickProps {
  isVisible: boolean;
  left: string;
  top: string;
}

interface Props {
  code?: JSX.Element;
  state: HostTrace;
}
