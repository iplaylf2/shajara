import type {
  ExplorerExampleEvent,
  ExplorerExampleId,
  ExplorerReplayRuntime,
} from "#/domain/explorer/examples";
import type { ExplorerReplayFrame, ExplorerReplayState } from "#/domain/explorer/contract";
import type { JSX, Setter } from "solid-js";
import { createReplayFrameStream, playbackReplayFrames } from "./replay-stream";
import { createScope, sleep } from "@shajara/host";
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

  onMount(function mountExplorerReplayDemo() {
    onCleanup(
      startReplay(
        props.stage,
        {
          eventIds: props.stage.eventIds,
          lines: readCodeLines(props.codeBlockId),
          scroller: createCodeScroller(isCodeAutoScrollEnabled),
        },
        readExplorerReplayRuntime(props.exampleId),
        setState,
      ),
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

function startReplay(
  stage: ExplorerReplayStage,
  codeView: ReplayCodeView,
  replayRuntime: ExplorerReplayRuntime,
  setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>,
): () => void {
  return new ExplorerReplaySession(stage, codeView, replayRuntime, setState).start();
}

class ExplorerReplaySession {
  readonly #codeView: ReplayCodeView;
  readonly #replayRuntime: ExplorerReplayRuntime;
  readonly #replayScope = createScope();
  readonly #setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>;
  readonly #stage: ExplorerReplayStage;
  readonly #updateState: (frame: ExplorerReplayFrame<ExplorerExampleEvent>) => void;
  #isMounted = true;

  public constructor(
    stage: ExplorerReplayStage,
    codeView: ReplayCodeView,
    replayRuntime: ExplorerReplayRuntime,
    setState: Setter<ExplorerReplayState<ExplorerExampleEvent>>,
  ) {
    this.#codeView = codeView;
    this.#replayRuntime = replayRuntime;
    this.#setState = setState;
    this.#stage = stage;
    this.#updateState = createStateUpdater(codeView, setState, () => this.#isMounted);
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
        queueUnexpectedFailure(error);
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
    for (;;) {
      if (!this.#isMounted) {
        return;
      }

      yield* this.#runReplayCycle();

      if (this.#isMounted) {
        yield* sleep(this.#stage.replay.replayDelayMs);
      }
    }
  }

  *#runReplayCycle(): RiteCoroutine<void> {
    const pendingState = createPendingExplorerReplayState<ExplorerExampleEvent>();
    this.#setState(pendingState);
    syncCodeLines(this.#codeView, pendingState.cursors, pendingState.completed);

    yield* sleep(this.#stage.replay.replayDelayMs);
    yield* this.#playReplayProgram(pendingState);
  }

  *#playReplayProgram(
    pendingState: ExplorerReplayState<ExplorerExampleEvent>,
  ): RiteCoroutine<void> {
    const frameStream = yield* createReplayFrameStream<ExplorerExampleEvent>(pendingState);
    const replayProgram = this.#replayRuntime.createProgram();
    const playback = yield* spawn(() =>
      playbackReplayFrames(
        frameStream,
        pendingState,
        {
          isOpen: () => this.#isMounted,
          write: this.#updateState,
        },
        minRenderGapMs,
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

function queueUnexpectedFailure(error: unknown): void {
  globalThis.setTimeout(() => {
    throw error;
  }, emptyLength);
}

const emptyLength = 0;
const minRenderGapMs = 34;
