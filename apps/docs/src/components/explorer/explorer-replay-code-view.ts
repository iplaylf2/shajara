import type { CodeScroller } from "./explorer-code-scroller";
import type { ExplorerExampleEvent } from "#/domain/explorer/examples";
import type { ExplorerReplayCursor } from "#/domain/explorer/contract";
import styles from "./explorer.module.css";

export interface ReplayCodeView {
  eventIds: readonly ExplorerExampleEvent[];
  lines: readonly HTMLElement[];
  scroller: CodeScroller;
}

export function readCodeLines(codeBlockId: string): HTMLElement[] {
  return [
    ...globalThis.document.querySelectorAll<HTMLElement>(
      `#${globalThis.CSS.escape(codeBlockId)} [data-explorer-line-event]`,
    ),
  ];
}

export function syncCodeLines(
  codeView: ReplayCodeView,
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
  completed: readonly ExplorerExampleEvent[],
): void {
  const activeClass = styles["explorerCodeLineActive"]!;
  const doneClass = styles["explorerCodeLineDone"]!;
  let firstActiveLine: HTMLElement | null = null;

  for (const line of codeView.lines) {
    const lineEvent = readLineEvent(line, codeView.eventIds);
    const completedEvents = readLineEvents(readCompletedLineEvents(line), codeView.eventIds);
    const isActive = cursors.some((cursor) => cursor.events.includes(lineEvent));

    line.classList.toggle(activeClass, isActive);
    line.classList.toggle(
      doneClass,
      completedEvents.some((event) => completed.includes(event)) && !isActive,
    );

    if (isActive && !firstActiveLine) {
      firstActiveLine = line;
    }
  }

  if (firstActiveLine) {
    codeView.scroller.scrollToLine(firstActiveLine);
  }
}

function readLineEvent(
  line: HTMLElement,
  eventIds: readonly ExplorerExampleEvent[],
): ExplorerExampleEvent {
  const event = line.dataset["explorerLineEvent"];

  if (!isExplorerEventId(event, eventIds)) {
    throw new Error(`Unknown explorer code line event: ${String(event)}`);
  }

  return event;
}

function readCompletedLineEvents(line: HTMLElement): string {
  const completedEvents = line.dataset["explorerCompletedEvents"];

  if (typeof completedEvents !== "string") {
    throw new TypeError("Explorer code line is missing completed events metadata.");
  }

  return completedEvents;
}

function readLineEvents(
  value: string,
  eventIds: readonly ExplorerExampleEvent[],
): ExplorerExampleEvent[] {
  const events: ExplorerExampleEvent[] = [];

  for (const entry of value.split(" ")) {
    if (entry.length === emptyLength) {
      continue;
    }
    if (!isExplorerEventId(entry, eventIds)) {
      throw new Error(`Unknown explorer completed line event: ${entry}`);
    }

    events.push(entry);
  }

  return events;
}

function isExplorerEventId(
  value: string | undefined,
  eventIds: readonly ExplorerExampleEvent[],
): value is ExplorerExampleEvent {
  return typeof value === "string" && eventIds.some((eventId) => eventId === value);
}

const emptyLength = 0;
