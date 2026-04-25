import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayRuntime,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import type { RiteCoroutine, Scope } from "@shajara/host";
import { createReplayFrameStream, playbackReplayFrames } from "./explorer-replay-stream";
import { createScope, sleep } from "@shajara/host";
import { createSignal, onCleanup, onMount } from "solid-js";
import { spawn, wait } from "@shajara/host/primitives";
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
  const replayScope = createScope();
  const replayRuntime = readExplorerRuntime(exampleId);
  const codeLines = readCodeLines(codeBlockId);
  const updateState = createStateUpdater(setState, codeLines, () => isMounted);
  const cleanupReplay = cleanupReplayScope(() => {
    isMounted = false;
  }, replayScope);
  const replayCycle = {
    codeLines,
    isMounted: () => isMounted,
    replayRuntime,
    setState,
    stage,
    updateState,
  };

  replayScope.run(() => runReplayLoop(replayCycle, handleReplayError)).catch(handleReplayError);

  return cleanupReplay;

  function handleReplayError(): void {
    if (!isMounted) {
      return;
    }

    setState(stage.replay.initialState);
  }
}

function* runReplayLoop(
  replayCycle: ReplayCycleContext,
  handleReplayError: () => void,
): RiteCoroutine<void> {
  for (;;) {
    if (!replayCycle.isMounted()) {
      return;
    }

    try {
      yield* runReplayCycle(replayCycle);
    } catch {
      handleReplayError();
      return;
    }

    if (replayCycle.isMounted()) {
      yield* sleep(replayCycle.stage.replay.replayDelayMs);
    }
  }
}

function readExplorerRuntime(exampleId: ExplorerExampleId): ExplorerReplayRuntime<string, unknown> {
  return readExplorerExample(exampleId).stage.replay.runtime as ExplorerReplayRuntime<
    string,
    unknown
  >;
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
    setState({
      active: frame.active,
      completed: frame.completed,
      cursors: frame.cursors,
    });
  };
}

function cleanupReplayScope(dispose: () => void, replayScope: Scope): () => void {
  return function cleanupExplorerReplay() {
    dispose();
    replayScope.cancel().catch(() => null);
  };
}

function readCodeLines(codeBlockId: string): HTMLElement[] {
  return [
    ...globalThis.document.querySelectorAll<HTMLElement>(
      `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-cursor-events], ` +
        `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-done-events]`,
    ),
  ];
}

function* runReplayCycle(context: ReplayCycleContext): RiteCoroutine<void> {
  context.setState(context.stage.replay.initialState);
  syncCodeLines(
    context.codeLines,
    context.stage.replay.initialState.cursors,
    context.stage.replay.initialState.completed,
  );

  yield* playReplayRoutine(context);
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

function* playReplayRoutine(context: ReplayCycleContext): RiteCoroutine<unknown> {
  const frameStream = yield* createReplayFrameStream<string>();
  const playback = yield* spawn(() =>
    playbackReplayFrames(frameStream, {
      initialState: context.stage.replay.initialState,
      isMounted: context.isMounted,
      minRenderGapMs,
      updateState: context.updateState,
    }),
  );

  try {
    return yield* context.replayRuntime.createRoutine()(frameStream.record);
  } finally {
    yield* frameStream.finish();
    yield* wait(playback);
  }
}

function readLineEvents(value: string | undefined): string[] {
  return value?.split(" ").filter((entry) => entry.length > emptyLength) ?? [];
}

interface ReplayCycleContext {
  codeLines: readonly HTMLElement[];
  isMounted: () => boolean;
  replayRuntime: ExplorerReplayRuntime<string, unknown>;
  setState: Setter<ExplorerReplayState>;
  stage: ExplorerReplayStage;
  updateState: (frame: ExplorerReplayFrame<string>) => void;
}

const emptyLength = 0;
const minRenderGapMs = 34;
