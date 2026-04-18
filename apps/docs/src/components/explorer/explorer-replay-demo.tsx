import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayRunner,
  ExplorerReplayRuntime,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import { createReplayEventStream, playbackRecordedEvents } from "./explorer-replay-stream";
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

interface Props {
  children?: JSX.Element;
  codeBlockId: string;
  exampleId: ExplorerExampleId;
  stage: ExplorerReplayStage;
}

interface ExplorerReplaySession {
  cancel: () => Promise<void>;
  reset: () => void;
  run: (mark: (frame: ExplorerReplayFrame<string>) => void) => Promise<unknown>;
  runtime: ExplorerReplayRuntime;
}

interface ExplorerReplayStage {
  replay: {
    initialState: ExplorerReplayState<string>;
    replayDelayMs: number;
  };
  scene: ExplorerFlowScene<string>;
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
  const updateState = createStateUpdater(setState, codeLines, () => isMounted);
  const cleanupReplay = cleanupReplaySession(
    () => {
      isMounted = false;
    },
    () => replayTimer,
    replaySession,
  );
  const replayCycle = {
    codeLines,
    isMounted: () => isMounted,
    replaySession,
    setState,
    stage,
    updateState,
  };

  runReplayCycle(replayCycle).then(scheduleReplay).catch(handleReplayError);

  return cleanupReplay;

  function handleReplayError(): void {
    if (!isMounted) {
      return;
    }

    setState((current) => ({ ...current, result: "error" }));
  }

  function scheduleReplay(): void {
    replayTimer = globalThis.setTimeout(function replayExplorerDemo() {
      runReplayCycle(replayCycle).then(scheduleReplay).catch(handleReplayError);
    }, stage.replay.replayDelayMs);
  }
}

function createReplaySession(exampleId: ExplorerExampleId): ExplorerReplaySession {
  const runtime = readExplorerExample(exampleId).stage.replay.runtime as ExplorerReplayRuntime;
  let replay = runtime.createRunner() as ExplorerReplayRunner;

  return {
    cancel() {
      return replay.cancel();
    },
    reset() {
      replay = runtime.createRunner();
    },
    run(mark) {
      return replay.run(mark);
    },
    runtime,
  };
}

function createStateUpdater(
  setState: Setter<ExplorerReplayState>,
  codeLines: readonly HTMLElement[],
  isMounted: () => boolean,
): (frame: ExplorerReplayFrame<string>) => void {
  return function updateState(frame: ExplorerReplayFrame<string>): void {
    if (!isMounted()) {
      return;
    }

    syncCodeLines(codeLines, frame.cursors, frame.completed);
    setState((current) => ({
      active: frame.active,
      completed: frame.completed,
      cursors: frame.cursors,
      result: current.result,
    }));
  };
}

function cleanupReplaySession(
  dispose: () => void,
  readReplayTimer: () => ReturnType<typeof globalThis.setTimeout> | null,
  replaySession: ExplorerReplaySession,
): () => void {
  return function cleanupExplorerReplay() {
    dispose();
    const replayTimer = readReplayTimer();

    if (replayTimer !== null) {
      globalThis.clearTimeout(replayTimer);
    }
    replaySession.cancel().catch(() => null);
  };
}

function readCodeLines(codeBlockId: string): HTMLElement[] {
  return Array.from(
    globalThis.document.querySelectorAll<HTMLElement>(
      `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-cursor-events], ` +
        `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-done-events]`,
    ),
  );
}

async function runReplayCycle(context: ReplayCycleContext): Promise<void> {
  context.setState(context.stage.replay.initialState);
  syncCodeLines(
    context.codeLines,
    context.stage.replay.initialState.cursors,
    context.stage.replay.initialState.completed,
  );

  const result = await playReplaySession(context);

  if (!context.isMounted()) {
    return;
  }

  context.setState((current) => ({
    ...current,
    result: context.replaySession.runtime.formatResult(result),
  }));
  context.replaySession.reset();
}

function syncCodeLines(
  lines: readonly HTMLElement[],
  cursors: readonly ExplorerReplayCursor<string>[],
  completed: readonly string[],
): void {
  const activeClass = styles["explorerCodeLineActive"]!;
  const doneClass = styles["explorerCodeLineDone"]!;

  for (const line of lines) {
    const cursorEvents = readLineEvents(line.dataset["explorerCursorEvents"]);
    const doneEvents = readLineEvents(line.dataset["explorerDoneEvents"]);
    const isActive = cursorEvents.some((event) => cursors.some((cursor) => cursor.event === event));

    line.classList.toggle(activeClass, isActive);
    line.classList.toggle(
      doneClass,
      doneEvents.some((event) => completed.includes(event)) && !isActive,
    );
  }
}

async function playReplaySession(context: ReplayCycleContext): Promise<unknown> {
  const eventStream = createReplayEventStream<string>();
  const playback = playbackRecordedEvents(eventStream, {
    initialState: context.stage.replay.initialState,
    isMounted: context.isMounted,
    minRenderGapMs,
    updateState: context.updateState,
  });

  try {
    return await context.replaySession.run(eventStream.record);
  } finally {
    eventStream.finish();
    await playback;
  }
}

function readLineEvents(value: string | undefined): string[] {
  return value?.split(" ").filter((entry) => entry.length > emptyLength) ?? [];
}

interface ReplayCycleContext {
  codeLines: readonly HTMLElement[];
  isMounted: () => boolean;
  replaySession: ExplorerReplaySession;
  setState: Setter<ExplorerReplayState>;
  stage: ExplorerReplayStage;
  updateState: (frame: ExplorerReplayFrame<string>) => void;
}

const emptyLength = 0;
const minRenderGapMs = 34;
