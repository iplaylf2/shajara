export interface CodeScroller {
  scrollToTop: (container: HTMLElement) => void;
  scrollToLine: (line: HTMLElement) => void;
}

export function createCodeScroller(isEnabled: () => boolean): CodeScroller {
  let lastLine: HTMLElement | null = null;
  let scrollFrame = EMPTY_LENGTH;

  return {
    scrollToLine(line) {
      if (!isEnabled()) {
        lastLine = null;
        return;
      }

      if (line === lastLine) {
        return;
      }

      lastLine = line;
      scheduleScroll(() => scrollCodeLineIntoView(line));
    },
    scrollToTop(container) {
      if (!isEnabled()) {
        lastLine = null;
        return;
      }

      lastLine = null;
      scheduleScroll(() => {
        container.scrollTo({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          top: EMPTY_LENGTH,
        });
      });
    },
  };

  function scheduleScroll(scroll: () => void): void {
    if (scrollFrame !== EMPTY_LENGTH) {
      globalThis.cancelAnimationFrame(scrollFrame);
    }

    scrollFrame = globalThis.requestAnimationFrame(() => {
      scrollFrame = EMPTY_LENGTH;
      scroll();
    });
  }
}

function scrollCodeLineIntoView(line: HTMLElement): void {
  const container = line.closest<HTMLElement>("[data-explorer-code]");

  if (!container) {
    throw new Error("Explorer code line is not inside an explorer code block.");
  }

  const containerRect = container.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const comfortZone = container.clientHeight * CODE_SCROLL_COMFORT_RATIO;
  const isComfortablyVisible =
    lineRect.top >= containerRect.top + comfortZone &&
    lineRect.bottom <= containerRect.bottom - comfortZone;

  if (isComfortablyVisible) {
    return;
  }

  const targetTop =
    container.scrollTop +
    lineRect.top -
    containerRect.top -
    container.clientHeight * CODE_SCROLL_TARGET_RATIO +
    lineRect.height / HALF;

  container.scrollTo({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    top: Math.max(EMPTY_LENGTH, targetTop),
  });
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const EMPTY_LENGTH = 0;
const CODE_SCROLL_COMFORT_RATIO = 0.18;
const CODE_SCROLL_TARGET_RATIO = 0.42;
const HALF = 2;
