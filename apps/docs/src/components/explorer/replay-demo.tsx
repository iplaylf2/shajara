import { CanceledError, createScope, sleep } from "@shajara/host";
import type {
  ExplorerExampleEvent,
  ExplorerExampleId,
  ExplorerReplayRuntime,
} from "#/domain/explorer/examples";
import type { ExplorerReplayFrame, ExplorerReplayState } from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import { createReplayFrameStream, playbackReplayFrames } from "./replay-stream";
import { createSignal, onCleanup, onMount } from "solid-js";
import { readCodeLines, syncCodeLines } from "./replay-code-view";
import { spawn, wait } from "@shajara/host/primitives";
import { ExplorerFlowView } from "./flow-view";
import type { FlowScene } from "./flow-model";
import type { ReplayCodeView } from "./replay-code-view";
import type { RiteCoroutine } from "@shajara/host";
import { createCodeScroller } from "./code-scroller";
import { createPendingExplorerReplayState } from "#/domain/explorer/contract";
import { readExplorerReplayRuntime } from "#/domain/explorer/examples";
import styles from "./styles.module.css";

export function ExplorerReplayDemo(props: Props): JSX.Element {
  const [state, setState] = createSignal<ExplorerReplayState<ExplorerExampleEvent>>(
    createPendingExplorerReplayState(),
  );
  const [isCodeAutoScrollEnabled, setCodeAutoScrollEnabled] = createSignal(true);

  onMount(() => {
    onCleanup(
      startReplay({
        autoScroll: isCodeAutoScrollEnabled,
        lines: readCodeLines(props.codeBlockId),
        runtime: readExplorerReplayRuntime(props.exampleId),
        setState,
        stage: props.stage,
      }),
    );
  });

  return (
    <ExplorerFlowView
      code={props.children}
      codeControls={
        <label class={styles["codeAutoScrollToggle"]}>
          <input
            checked={isCodeAutoScrollEnabled()}
            class={styles["codeAutoScrollInput"]}
            onChange={(event) => setCodeAutoScrollEnabled(event.currentTarget.checked)}
            type="checkbox"
          />
          <span class={styles["codeAutoScrollSwitch"]}>
            <span class={styles["codeAutoScrollText"]}>
              {isCodeAutoScrollEnabled() ? props.codeFollowLabel : props.codeManualLabel}
            </span>
          </span>
        </label>
      }
      scene={props.stage.scene}
      state={state()}
    />
  );
}

interface Props {
  children?: JSX.Element;
  codeBlockId: string;
  codeFollowLabel: string;
  codeManualLabel: string;
  exampleId: ExplorerExampleId;
  stage: ExplorerReplayStage;
}

interface ExplorerReplayStage {
  eventIds: readonly ExplorerExampleEvent[];
  replay: {
    replayDelayMs: number;
  };
  scene: FlowScene<ExplorerExampleEvent>;
}

function startReplay(options: ReplaySessionOptions): () => void {
  return new ExplorerReplaySession(options).start();
}

interface ReplaySessionOptions {
  autoScroll: () => boolean;
  lines: readonly HTMLElement[];
  runtime: ExplorerReplayRuntime;
  setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>;
  stage: ExplorerReplayStage;
}

class ExplorerReplaySession {
  readonly #autoScroll: () => boolean;
  readonly #lines: readonly HTMLElement[];
  readonly #replayScope = createScope();
  readonly #runtime: ExplorerReplayRuntime;
  readonly #setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>;
  readonly #stage: ExplorerReplayStage;
  #isMounted = true;

  public constructor(options: ReplaySessionOptions) {
    this.#autoScroll = options.autoScroll;
    this.#lines = options.lines;
    this.#runtime = options.runtime;
    this.#setState = options.setState;
    this.#stage = options.stage;
  }

  public start(): () => void {
    this.#replayScope
      .run(() => this.#runReplayLoop())
      .catch((error) => {
        this.#handleReplayFailure(error);
      });

    return () => {
      this.#isMounted = false;
      this.#replayScope.cancel().catch((error) => {
        reportUnexpectedCancelFailure(error);
      });
    };
  }

  #handleReplayFailure(error: unknown): void {
    if (!this.#isMounted) {
      return;
    }

    throw error;
  }

  *#runReplayLoop(): RiteCoroutine<void> {
    const codeView: ReplayCodeView = {
      eventIds: this.#stage.eventIds,
      lines: this.#lines,
      scroller: yield* createCodeScroller(this.#autoScroll),
    };
    const updateState = createStateUpdater(codeView, this.#setState, () => this.#isMounted);

    for (;;) {
      if (!this.#isMounted) {
        return;
      }

      yield* this.#runReplayCycle(codeView, updateState);

      if (this.#isMounted) {
        yield* sleep(this.#stage.replay.replayDelayMs);
      }
    }
  }

  *#runReplayCycle(
    codeView: ReplayCodeView,
    updateState: (frame: ExplorerReplayFrame<ExplorerExampleEvent>) => void,
  ): RiteCoroutine<void> {
    const pendingState = createPendingExplorerReplayState<ExplorerExampleEvent>();
    this.#setState(pendingState);
    syncCodeLines(codeView, pendingState.cursors, pendingState.completed);

    yield* sleep(this.#stage.replay.replayDelayMs);
    yield* this.#playReplayProgram(pendingState, updateState);
  }

  *#playReplayProgram(
    pendingState: ExplorerReplayState<ExplorerExampleEvent>,
    updateState: (frame: ExplorerReplayFrame<ExplorerExampleEvent>) => void,
  ): RiteCoroutine<void> {
    const frameStream = yield* createReplayFrameStream<ExplorerExampleEvent>(pendingState);
    const replayProgram = this.#runtime.createProgram();
    const playback = yield* spawn(() =>
      playbackReplayFrames(
        frameStream,
        pendingState,
        {
          isOpen: () => this.#isMounted,
          write: updateState,
        },
        MIN_RENDER_GAP_MS,
      ),
    );

    try {
      yield* replayProgram(frameStream.emit);
    } finally {
      frameStream.finish();
      yield* wait(playback);
    }
  }
}

function createStateUpdater(
  codeView: ReplayCodeView,
  setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>,
  isMounted: () => boolean,
): (frame: ExplorerReplayFrame<ExplorerExampleEvent>) => void {
  return function updateState(frame: ExplorerReplayFrame<ExplorerExampleEvent>): void {
    if (!isMounted()) {
      return;
    }

    syncCodeLines(codeView, frame.cursors, frame.completed);
    setState({
      active: frame.active,
      completed: frame.completed,
      cursors: frame.cursors,
    });
  };
}

function reportUnexpectedCancelFailure(error: unknown): void {
  if (error instanceof CanceledError) {
    return;
  }

  throw error;
}

const MIN_RENDER_GAP_MS = 34;
