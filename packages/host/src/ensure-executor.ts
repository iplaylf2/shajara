import type { Disposable, Executor, Scheduler } from "@shajara/kernel";
import { createExecutor } from "@shajara/kernel";

export function ensureExecutor(): Executor {
  executorSingleton ??= createExecutor(new ShajaraScheduler());
  return executorSingleton;
}

let executorSingleton: Executor | null = null;

// ── Scheduler ──────────────────────────────────────────────

class ShajaraScheduler implements Scheduler {
  nextTick(work: () => void): Disposable {
    return postTask(() => {
      const now = globalThis.performance.now();
      this.#calibrate(now);
      this.#computeDeadline(now);
      work();
    });
  }

  /**
   * Predicting whether the current frame budget is spent may not be the right
   * approach. Mainstream runtimes increasingly treat scheduling as opaque and
   * delegate yield decisions to a host-level scheduler (e.g. scheduler.yield()).
   * This Scheduler contract may need a redesign that defers to runtime
   * scheduling primitives rather than estimating deadlines manually.
   */
  isExhausted(): boolean {
    return globalThis.performance.now() >= this.#deadline;
  }

  /** Refine frame period and origin from observed tick intervals. */
  #calibrate(now: number): void {
    if (this.#previousTickStart > FLOOR) {
      const gap = now - this.#previousTickStart;
      if (gap > this.#framePeriod * FRAME_GAP_THRESHOLD) {
        const frames = Math.max(MIN_FRAME_COUNT, Math.round(gap / this.#framePeriod));
        const observed = gap / frames;
        this.#framePeriod = this.#framePeriod * RETENTION + observed * SMOOTHING;
        this.#frameOrigin = now;
      }
    } else {
      this.#frameOrigin = now;
    }
    this.#previousTickStart = now;
  }

  /** Set deadline based on estimated remaining time in the current frame. */
  #computeDeadline(now: number): void {
    const intoFrame = (now - this.#frameOrigin) % this.#framePeriod;
    const remaining = this.#framePeriod - intoFrame - YIELD_MARGIN;
    this.#deadline = now + Math.max(FLOOR, remaining);
  }

  #framePeriod = INITIAL_FRAME_PERIOD;
  #frameOrigin = FLOOR;
  #deadline = FLOOR;
  #previousTickStart = FLOOR;
}

// ── Task posting ───────────────────────────────────────────

function postTask(callback: () => void): Disposable {
  const entry: { fn: (() => void) | null } = { fn: callback };
  taskQueue.push(entry);
  taskChannel.port2.postMessage(null);
  return {
    dispose: () => {
      entry.fn = null;
    },
  };
}

// ── Constants ──────────────────────────────────────────────

// Ms, targeting ~60 fps
const INITIAL_FRAME_PERIOD = 16;
// Ms, reserved for rendering / host work
const YIELD_MARGIN = 4;
// Exponential smoothing factor for frame period
const SMOOTHING = 0.3;
const RETENTION = 0.7;
const FRAME_GAP_THRESHOLD = 0.5;
const MIN_FRAME_COUNT = 1;
const FLOOR = 0;

// ── Task channel ───────────────────────────────────────────

const taskQueue: { fn: (() => void) | null }[] = [];
const taskChannel = new globalThis.MessageChannel();
taskChannel.port1.onmessage = () => {
  taskQueue.shift()?.fn?.();
};
