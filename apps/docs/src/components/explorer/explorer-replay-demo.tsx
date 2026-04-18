import type {
  ExplorerReplayRunner,
  ExplorerReplayRuntime,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import type { ExplorerExampleId } from "#/domain/explorer/examples";
import type { ExplorerFlowScene } from "./explorer-flow-scene";
import { ExplorerFlowView } from "./explorer-flow-view";
import { readExplorerExample } from "#/domain/explorer/examples";
import styles from "./explorer.module.css";

export function ExplorerReplayDemo(props: Props): JSX.Element {
  const [state, setState] = createSignal<ExplorerReplayState>(props.stage.replay.initialState);

  onMount(function mountExplorerReplayDemo() {
    onCleanup(startReplay(setState, props.codeBlockId, props.stage, props.exampleId));
  });

  return <ExplorerFlowView code={props.children} scene={props.stage.scene} state={state()} />;
}

function startReplay(
  setState: Setter<ExplorerReplayState>,
  codeBlockId: string,
  stage: ExplorerReplayStage,
  exampleId: ExplorerExampleId,
): () => void {
  let isMounted = true;
  let replayTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const replaySession = createReplaySession(exampleId);
  const codeLines = readCodeLines(codeBlockId);
  const completedEvents: string[] = [];
  const updateState = createStateUpdater(setState, codeLines, completedEvents, () => isMounted);

  function scheduleReplay(): void {
    replayTimer = globalThis.setTimeout(function replayExplorerDemo() {
      play().catch(handleError);
    }, stage.replay.replayDelayMs);
  }

  function handleError(): void {
    if (isMounted) {
      setState((current) => ({ ...current, result: "error" }));
    }
  }

  function applyResult(result: unknown): void {
    if (!isMounted) {
      return;
    }

    setState((current) => ({
      ...current,
      result: replaySession.runtime.formatResult(result),
    }));
    replaySession.reset();
    scheduleReplay();
  }

  async function play(): Promise<void> {
    const mark = updateState;

    setState(stage.replay.initialState);
    completedEvents.length = 0;
    updateState(stage.replay.initialState.active);
    const result = await replaySession.run(mark);

    applyResult(result);
  }

  play().catch(handleError);

  return function cleanupExplorerReplay() {
    isMounted = false;
    if (replayTimer !== null) {
      globalThis.clearTimeout(replayTimer);
    }
    replaySession.cancel().catch(handleError);
  };
}

function createReplaySession(exampleId: ExplorerExampleId): ExplorerReplaySession {
  const runtime = readExplorerExample(exampleId).stage.replay.runtime as ExplorerReplayRuntime;
  let replay: ExplorerReplayRunner = runtime.createRunner();

  return {
    cancel() {
      return replay.cancel();
    },
    reset() {
      replay = runtime.createRunner();
    },
    run(mark: (event: string) => void): Promise<unknown> {
      return replay.run(mark);
    },
    runtime,
  };
}

function createStateUpdater(
  setState: Setter<ExplorerReplayState>,
  codeLines: readonly HTMLElement[],
  completedEvents: string[],
  isMounted: () => boolean,
): (event: string) => void {
  return function updateState(event: string): void {
    if (!isMounted()) {
      return;
    }

    if (!completedEvents.includes(event)) {
      completedEvents.push(event);
    }
    syncCodeLines(codeLines, event, completedEvents);

    setState((current) => ({
      active: event,
      completed: current.completed.includes(event)
        ? current.completed
        : [...current.completed, event],
      result: current.result,
    }));
  };
}

function readCodeLines(codeBlockId: string): HTMLElement[] {
  return Array.from(
    globalThis.document.querySelectorAll<HTMLElement>(
      `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-event]`,
    ),
  );
}

function syncCodeLines(
  lines: readonly HTMLElement[],
  active: string,
  completed: readonly string[],
): void {
  const activeClass = style("explorerCodeLineActive");
  const doneClass = style("explorerCodeLineDone");

  for (const line of lines) {
    const event = line.dataset["explorerEvent"];

    line.classList.toggle(activeClass, event === active);
    line.classList.toggle(
      doneClass,
      typeof event === "string" && completed.includes(event) && event !== active,
    );
  }
}

function style(name: string): string {
  const className = styles[name];

  if (!className) {
    throw new Error(`Missing explorer style: ${name}`);
  }

  return className;
}

interface Props {
  children?: JSX.Element;
  codeBlockId: string;
  exampleId: ExplorerExampleId;
  stage: ExplorerReplayStage;
}

interface ExplorerReplaySession {
  cancel: () => Promise<void>;
  reset: () => void;
  run: (mark: (event: string) => void) => Promise<unknown>;
  runtime: ExplorerReplayRuntime;
}

interface ExplorerReplayStage {
  replay: {
    initialState: ExplorerReplayState<string>;
    replayDelayMs: number;
  };
  scene: ExplorerFlowScene<string>;
}
