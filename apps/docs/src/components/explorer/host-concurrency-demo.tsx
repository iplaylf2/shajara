import type { HostConcurrencyEvent, HostTrace } from "#/domain/explorer/host-concurrency/trace";
import type { JSX, Setter } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import { HostConcurrencyView } from "./host-concurrency-view";
import { INITIAL_HOST_TRACE } from "#/domain/explorer/host-concurrency/trace";
import { createHostConcurrencyReplay } from "#/domain/explorer/host-concurrency/runtime";
import styles from "./explorer.module.css";

export function HostConcurrencyDemo(props: Props): JSX.Element {
  const [state, setState] = createSignal<HostTrace>(INITIAL_HOST_TRACE);

  onMount(function mountHostConcurrencyDemo() {
    onCleanup(startHostReplay(setState, props.codeBlockId));
  });

  return <HostConcurrencyView code={props.children} state={state()} />;
}

const HOST_REPLAY_DELAY_MS = 900;

interface Props {
  children?: JSX.Element;
  codeBlockId: string;
}

function startHostReplay(setState: Setter<HostTrace>, codeBlockId: string): () => void {
  let isMounted = true;
  let replayTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const replay = createHostConcurrencyReplay();
  const codeLines = readCodeLines(codeBlockId);
  const completedEvents: HostConcurrencyEvent[] = [];
  const updateState = createStateUpdater(setState, codeLines, completedEvents, () => isMounted);

  function mark(event: HostConcurrencyEvent): void {
    updateState(event);
  }

  function scheduleReplay(): void {
    replayTimer = globalThis.setTimeout(function replayHostDemo() {
      play().catch(handleError);
    }, HOST_REPLAY_DELAY_MS);
  }

  function handleError(): void {
    if (isMounted) {
      setState((current) => ({ ...current, result: "error" }));
    }
  }

  async function play(): Promise<void> {
    setState(INITIAL_HOST_TRACE);
    completedEvents.length = 0;
    updateState(INITIAL_HOST_TRACE.active);
    const result = await replay.run(mark);

    if (isMounted) {
      setState((current) => ({ ...current, result: `${result.header} + ${result.sidebar}` }));
      scheduleReplay();
    }
  }

  play().catch(handleError);

  return function cleanupHostReplay() {
    isMounted = false;
    if (replayTimer !== null) {
      globalThis.clearTimeout(replayTimer);
    }
    replay.cancel().catch(handleError);
  };
}

function createStateUpdater(
  setState: Setter<HostTrace>,
  codeLines: readonly HTMLElement[],
  completedEvents: HostConcurrencyEvent[],
  isMounted: () => boolean,
): (event: HostConcurrencyEvent) => void {
  return function updateState(event: HostConcurrencyEvent): void {
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
      `#${globalThis.CSS.escape(codeBlockId)} [data-host-concurrency-event]`,
    ),
  );
}

function syncCodeLines(
  lines: readonly HTMLElement[],
  active: HostConcurrencyEvent,
  completed: readonly HostConcurrencyEvent[],
): void {
  const activeClass = style("hostConcurrencyCodeLineActive");
  const doneClass = style("hostConcurrencyCodeLineDone");

  for (const line of lines) {
    const event = line.dataset["hostConcurrencyEvent"];

    line.classList.toggle(activeClass, event === active);
    line.classList.toggle(
      doneClass,
      completed.includes(event as HostConcurrencyEvent) && event !== active,
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
