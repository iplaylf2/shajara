import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayRuntime,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import { createReplayFrameStream, playbackReplayFrames } from "./explorer-replay-stream";
import { createScope, sleep } from "@shajara/host";
import { createSignal, onCleanup, onMount } from "solid-js";
import { spawn, wait } from "@shajara/host/primitives";
import type { ExplorerExampleId } from "#/domain/explorer/examples";
import type { ExplorerFlowScene } from "./explorer-flow-scene";
import { ExplorerFlowView } from "./explorer-flow-view";
import type { RiteCoroutine } from "@shajara/host";
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
  const replayRuntime = readExplorerExample(exampleId).stage.replay
    .runtime as ExplorerReplayRuntime<string, unknown>;
  const codeLines = readCodeLines(codeBlockId);
  const updateState = createStateUpdater(setState, codeLines, () => isMounted);
  const replayCycle = {
    codeLines,
    isMounted: () => isMounted,
    replayRuntime,
    setState,
    stage,
    updateState,
  };

  replayScope.run(() => runReplayLoop(replayCycle)).catch(handleReplayFailure);

  return function cleanupExplorerReplay() {
    isMounted = false;
    replayScope.cancel().catch(() => null);
  };

  function handleReplayFailure(error: unknown): void {
    if (!isMounted) {
      return;
    }

    throw error;
  }
}

function* runReplayLoop(replayCycle: ReplayCycleContext): RiteCoroutine<void> {
  for (;;) {
    if (!replayCycle.isMounted()) {
      return;
    }

    yield* runReplayCycle(replayCycle);

    if (replayCycle.isMounted()) {
      yield* sleep(replayCycle.stage.replay.replayDelayMs);
    }
  }
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

function readCodeLines(codeBlockId: string): HTMLElement[] {
  return [
    ...globalThis.document.querySelectorAll<HTMLElement>(
      `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-line-event]`,
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
    const lineEvent = line.dataset["explorerLineEvent"];
    const completedEvents = readLineEvents(line.dataset["explorerCompletedEvents"]);
    const isActive =
      typeof lineEvent === "string" && cursors.some((cursor) => cursor.events.includes(lineEvent));

    line.classList.toggle(activeClass, isActive);
    line.classList.toggle(
      doneClass,
      completedEvents.some((event) => completed.includes(event)) && !isActive,
    );
  }
}

function* playReplayRoutine(context: ReplayCycleContext): RiteCoroutine<unknown> {
  const frameStream = yield* createReplayFrameStream<string>(context.stage.replay.initialState);
  const replayRoutine = context.replayRuntime.createRoutine();
  const playback = yield* spawn(() =>
    playbackReplayFrames(frameStream, {
      initialState: context.stage.replay.initialState,
      isMounted: context.isMounted,
      minRenderGapMs,
      updateState: context.updateState,
    }),
  );

  try {
    return yield* replayRoutine(frameStream.emit);
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
