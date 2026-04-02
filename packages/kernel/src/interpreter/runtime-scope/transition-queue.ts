export class TransitionQueue<Signal extends { kind: string }> {
  public constructor(private readonly consume: (signal: Signal) => void) {}

  public append(signal: Signal): void {
    if (this.#sealed) {
      return;
    }

    this.#pending.push({ signal });
  }

  public merge(signal: Signal, merge: (current: Signal, next: Signal) => void): void {
    if (this.#sealed) {
      return;
    }

    const tail = this.#pending.at(-1);
    if (tail && tail.signal.kind === signal.kind) {
      merge(tail.signal, signal);
      return;
    }

    this.#pending.push({ signal });
  }

  public seal(signal: Signal): void {
    if (this.#sealed) {
      return;
    }

    this.#pending.push({ signal });
    this.#sealed = true;
  }

  public close(): void {
    this.#pending.length = 0;
    this.#sealed = false;
  }

  public exhaust(afterConsume: () => void): void {
    if (this.#isDraining) {
      return;
    }

    this.#isDraining = true;

    while (this.#pending.length > 0) {
      const entry = this.#pending.shift() as PendingEntry<Signal>;
      this.consume(entry.signal);
      afterConsume();
    }

    this.#isDraining = false;
  }

  readonly #pending: PendingEntry<Signal>[] = [];
  #isDraining = false;
  #sealed = false;
}

interface PendingEntry<Signal> {
  signal: Signal;
}
