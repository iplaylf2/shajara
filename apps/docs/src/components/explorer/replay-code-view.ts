import type { CodeScroller } from "./code-scroller";
import type { ExplorerExampleEvent } from "#/domain/explorer/examples";
import type { ExplorerReplayCursor } from "#/domain/explorer/contract";
import styles from "./styles.module.css";

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

  for (const line of codeView.lines) {
    const lineEvent = readLineEvent(line, codeView.eventIds);
    const completedEvents = readLineEvents(readCompletedLineEvents(line), codeView.eventIds);
    const isActive = cursors.some((cursor) => cursor.events.includes(lineEvent));

    line.classList.toggle(activeClass, isActive);
    line.classList.toggle(
      doneClass,
      completedEvents.some((event) => completed.includes(event)) && !isActive,
    );
  }

  syncCodeScroll(codeView, cursors, completed);
}

function syncCodeScroll(
  codeView: ReplayCodeView,
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
  completed: readonly ExplorerExampleEvent[],
): void {
  if (isReplayPreparing(cursors, completed)) {
    codeView.scroller.scrollToTop(readCodeContainer(codeView));
    return;
  }

  scrollToActiveLine(codeView, cursors);
}

function isReplayPreparing(
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
  completed: readonly ExplorerExampleEvent[],
): boolean {
  return cursors.length === EMPTY_LENGTH && completed.length === EMPTY_LENGTH;
}

function readCodeContainer(codeView: ReplayCodeView): HTMLElement {
  const firstLine = codeView.lines.at(FIRST_INDEX);
  const container = firstLine?.closest<HTMLElement>("[data-explorer-code]");

  if (!container) {
    throw new Error("Explorer code block is missing its scroll container.");
  }

  return container;
}

function readPrimaryActiveLine(
  lines: readonly HTMLElement[],
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
  eventIds: readonly ExplorerExampleEvent[],
): HTMLElement | null {
  const runningCursor = cursors.find((cursor) => cursor.mode === "running");

  if (!runningCursor) {
    return null;
  }

  for (const line of lines) {
    const lineEvent = readLineEvent(line, eventIds);

    if (runningCursor.events.includes(lineEvent)) {
      return line;
    }
  }

  return null;
}

function readFirstActiveLine(
  lines: readonly HTMLElement[],
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
  eventIds: readonly ExplorerExampleEvent[],
): HTMLElement | null {
  for (const line of lines) {
    const lineEvent = readLineEvent(line, eventIds);
    const isActive = cursors.some((cursor) => cursor.events.includes(lineEvent));

    if (isActive) {
      return line;
    }
  }

  return null;
}

function scrollToActiveLine(
  codeView: ReplayCodeView,
  cursors: readonly ExplorerReplayCursor<ExplorerExampleEvent>[],
): void {
  const firstActiveLine = readFirstActiveLine(codeView.lines, cursors, codeView.eventIds);
  const focusLine =
    readPrimaryActiveLine(codeView.lines, cursors, codeView.eventIds) ?? firstActiveLine;

  if (focusLine) {
    codeView.scroller.scrollToLine(focusLine);
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
    if (entry.length === EMPTY_LENGTH) {
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

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;
