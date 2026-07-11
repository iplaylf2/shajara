// oxlint-disable no-magic-numbers
import type { Disposer } from "@shajara/kernel/utils";

/** Coordinates deferred executor turns with periodic flush turns. */
export class TurnCoordinator implements Disposable {
  public constructor(
    flushTurn: () => void,
    public readonly turnIntervalMs: number,
  ) {
    this.#flushTurn = flushTurn;
    const flushTurnAt = now();
    this.#flush = {
      lastAt: flushTurnAt,
      nextAt: flushTurnAt + this.turnIntervalMs,
      pendingAlignmentAt: 0,
      timer: null,
    };
    this.#channel.port1.onmessage = this.#handleTaskTurn.bind(this);
    this.#armFlushTurn();
  }

  public post(work: () => void): Disposer {
    const task = [work] as const;
    this.#tasks.add(task);
    this.#armTaskTurn();

    return () => {
      this.#tasks.delete(task);
      this.#armTaskTurn();
    };
  }

  public [Symbol.dispose](): void {
    if (this.#isDisposed) {
      return;
    }

    this.#isDisposed = true;
    this.#flush.pendingAlignmentAt = 0;
    this.#disarmTaskTurn();
    this.#disarmFlushTurn();
    this.#channel.port1.onmessage = null;
    this.#channel.port1.close();
    this.#channel.port2.close();
    this.#tasks.clear();
  }

  #handleTaskTurn(): void {
    if (this.#isDisposed) {
      return;
    }

    const turnAt = now();
    this.#disarmTaskTurn();
    if (!this.#isTaskTurnDue(turnAt)) {
      this.#armTaskTurn();
      return;
    }

    const errors = this.#runTaskTurn(turnAt);
    if (!this.#isDisposed) {
      errors.push(...this.#alignFlushTurn(turnAt));
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "Errors occurred while posting executor turn work");
    }
  }

  #runTaskTurn(turnAt: number): unknown[] {
    this.#task.nextAt = turnAt + this.turnIntervalMs;
    const tasks = [...this.#tasks];
    this.#tasks.clear();

    const errors: unknown[] = [];
    for (const [task] of tasks) {
      try {
        task();
      } catch (error) {
        errors.push(error);
      }
    }

    this.#armTaskTurn();
    return errors;
  }

  #alignFlushTurn(turnAt: number): unknown[] {
    if (turnAt >= this.#flush.nextAt) {
      this.#disarmFlushTurn();

      try {
        this.#performFlushTurn(turnAt, turnAt + this.turnIntervalMs);
      } catch (error) {
        return [error];
      } finally {
        this.#armFlushTurn();
      }

      return [];
    }

    const alignedFlushTurnAt = this.#alignmentTargetAfterTaskTurn(turnAt);
    this.#flush.nextAt = midway(this.#flush.nextAt, alignedFlushTurnAt);
    this.#flush.pendingAlignmentAt = alignedFlushTurnAt;
    this.#armFlushTurn();

    return [];
  }

  #isTaskTurnDue(turnAt: number): boolean {
    return this.#tasks.size > 0 && turnAt >= this.#task.nextAt;
  }

  #armTaskTurn(): void {
    if (this.#isDisposed) {
      this.#disarmTaskTurn();
      return;
    }

    if (this.#tasks.size === 0) {
      this.#disarmTaskTurn();
      return;
    }

    this.#disarmTaskTurn();
    const delayMs = Math.max(0, this.#task.nextAt - now());
    if (delayMs === 0) {
      this.#channel.port2.postMessage(null);
      return;
    }

    this.#task.timer = globalThis.setTimeout(() => {
      this.#task.timer = null;
      this.#handleTaskTurn();
    }, delayMs);
  }

  #disarmTaskTurn(): void {
    if (this.#task.timer === null) {
      return;
    }

    globalThis.clearTimeout(this.#task.timer);
    this.#task.timer = null;
  }

  /**
   * A task turn in the first half-beat means flush is ahead and should settle onto
   * the following aligned beat. In the second half-beat, flush is behind and can
   * settle onto the next aligned beat directly.
   */
  #alignmentTargetAfterTaskTurn(turnAt: number): number {
    const phase = phaseSince(this.#flush.lastAt, turnAt, this.turnIntervalMs);
    const beatsToTarget = phase < halfBeat(this.turnIntervalMs) ? 2 : 1;
    return turnAt + beatsToTarget * this.turnIntervalMs;
  }

  #armFlushTurn(): void {
    if (this.#isDisposed) {
      this.#disarmFlushTurn();
      return;
    }

    this.#disarmFlushTurn();

    const delayMs = Math.max(0, this.#flush.nextAt - now());
    this.#flush.timer = globalThis.setTimeout(() => {
      const turnAt = now();
      this.#flush.timer = null;
      this.#performFlushTurn(turnAt, this.#nextFlushTurnAfter(turnAt));
      this.#armFlushTurn();
    }, delayMs);
  }

  #disarmFlushTurn(): void {
    if (this.#flush.timer === null) {
      return;
    }

    globalThis.clearTimeout(this.#flush.timer);
    this.#flush.timer = null;
  }

  #performFlushTurn(turnAt: number, nextFlushTurnAt: number): void {
    this.#flush.lastAt = turnAt;
    this.#flush.nextAt = nextFlushTurnAt;
    this.#flush.pendingAlignmentAt = 0;
    this.#flushTurn();
  }

  #nextFlushTurnAfter(turnAt: number): number {
    if (this.#flush.pendingAlignmentAt > turnAt) {
      return this.#flush.pendingAlignmentAt;
    }

    return turnAt + this.turnIntervalMs;
  }

  #isDisposed = false;
  readonly #task: ScheduledTurnState = {
    nextAt: 0,
    timer: null,
  };
  readonly #flush: FlushTurnState;
  readonly #channel = new globalThis.MessageChannel();
  readonly #flushTurn: () => void;
  readonly #tasks = new Set<readonly [() => void]>();
}

interface ScheduledTurnState {
  nextAt: number;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
}

interface FlushTurnState {
  lastAt: number;
  nextAt: number;
  pendingAlignmentAt: number;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
}

function now(): number {
  return globalThis.performance.now();
}

function midway(left: number, right: number): number {
  return left + (right - left) / 2;
}

function halfBeat(turnIntervalMs: number): number {
  return turnIntervalMs / 2;
}

function phaseSince(lastTurnAt: number, turnAt: number, turnIntervalMs: number): number {
  if (turnIntervalMs === 0) {
    return 0;
  }

  return (turnAt - lastTurnAt) % turnIntervalMs;
}
