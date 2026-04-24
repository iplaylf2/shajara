import type {
  ChannelHandle,
  ChannelReceiver,
  ChannelSender,
  OverloadRewrite,
  ReceiveResult,
  SendResult,
} from "#/sigils/index";
import type { KEY_TOKEN, ScopeRef } from "#/contracts";
import type { Disposer } from "#/utils";
import type { RuntimeChannelHandle } from "./handle";
import { either } from "fp-ts";
import { identity } from "fp-ts/function";

export class RuntimeChannel<Waiter, Value, Outcome> implements RuntimeChannelHandle<
  Value,
  Outcome
> {
  public constructor(
    private readonly capacity: number,
    private readonly overloadRewrite: OverloadRewrite<Value>,
    public readonly scope: ScopeRef<unknown>,
  ) {
    this.#kind = channelKindOf(capacity);
  }

  public handle(): ChannelHandle<Value, Outcome> {
    return [this, this];
  }

  public close(outcome: Outcome): RuntimeChannelWaiters<Waiter> {
    return this.#dispose({ kind: "closed", outcome });
  }

  public tryTake(): RuntimeChannelTake<Waiter, Value, Outcome> | null {
    if (this.#buffer.length > EMPTY_SIZE) {
      const value = this.#buffer.shift()!;
      const sender = this.tryFill();

      return { result: { kind: "value", value }, sender };
    }

    const sender = takeFirstSender(this.#senders);
    if (sender) {
      return {
        result: { kind: "value", value: sender.value },
        sender: sender.waiter,
      };
    }

    switch (this.#state.kind) {
      case "open": {
        return null;
      }
      case "closed":
      case "revoked": {
        return { result: this.#state, sender: null };
      }
    }
  }

  public enqueueReceiver(receiver: Waiter): Disposer {
    this.#receivers.add(receiver);

    return () => {
      this.#receivers.delete(receiver);
    };
  }

  public tryPut(value: Value): RuntimeChannelPut<Waiter, Outcome> | null {
    switch (this.#state.kind) {
      case "closed":
      case "revoked": {
        return { receiver: null, result: this.#state };
      }
      case "open": {
        break;
      }
    }

    const receiver = takeFirstWaiter(this.#receivers);
    if (receiver) {
      return { receiver, result: { kind: "sent" } };
    }

    if (this.#buffer.length < this.capacity) {
      this.#buffer.push(value);

      return { receiver: null, result: { kind: "sent" } };
    }

    return null;
  }

  public enqueueSender(sender: Waiter, value: Value): Disposer {
    this.#senders.set(sender, { value, waiter: sender });

    return () => {
      this.#senders.delete(sender);
    };
  }

  public tryOverloadRewrite(value: Value): either.Either<unknown, boolean> {
    const rewriting = either.tryCatch(() => this.overloadRewrite(this.#buffer, value), identity);
    if (either.isLeft(rewriting)) {
      return rewriting;
    }

    const buffer = rewriting.right;
    if (buffer.length > this.capacity) {
      return either.right(true);
    }

    this.#buffer = buffer as Value[];

    return either.right(this.#buffer.length === this.capacity);
  }

  public tryFill(): Waiter | null {
    if (this.#kind !== "bounded" || this.capacity === this.#buffer.length) {
      return null;
    }

    const sender = takeFirstSender(this.#senders);
    if (!sender) {
      return null;
    }

    this.#buffer.push(sender.value);

    return sender.waiter;
  }

  public revoke(): RuntimeChannelWaiters<Waiter> {
    return this.#dispose({ kind: "revoked" });
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: ChannelReceiver<Value, Outcome>[typeof KEY_TOKEN] &
    ChannelSender<Value, Outcome>[typeof KEY_TOKEN];

  #dispose(
    state: Exclude<ChannelState<Outcome>, { readonly kind: "open" }>,
  ): RuntimeChannelWaiters<Waiter> {
    if (this.#state.kind !== "open") {
      return { receivers: [], senders: [] };
    }

    this.#state = state;
    this.#buffer = [];

    const receivers = [...this.#receivers];
    const senders = Array.from(this.#senders.values(), ({ waiter }) => waiter);
    this.#receivers.clear();
    this.#senders.clear();

    return { receivers, senders };
  }

  readonly #kind: ChannelKind;
  #state: ChannelState<Outcome> = { kind: "open" };
  #buffer: Value[] = [];
  // ECMAScript Set/Map preserve insertion order; waiter collections are FIFO queues.
  readonly #receivers = new Set<Waiter>();
  readonly #senders = new Map<unknown, RuntimeChannelSender<Waiter, Value>>();
}

function channelKindOf(capacity: number): ChannelKind {
  switch (capacity) {
    case RENDEZVOUS_CAPACITY: {
      return "rendezvous";
    }
    case Infinity: {
      return "unbounded";
    }
    default: {
      return "bounded";
    }
  }
}

function takeFirstWaiter<Waiter>(waiters: Set<Waiter>): Waiter | null {
  const [waiter] = waiters;

  if (!waiter) {
    return null;
  }

  waiters.delete(waiter);

  return waiter;
}

function takeFirstSender<Waiter, Value>(
  senders: Map<unknown, RuntimeChannelSender<Waiter, Value>>,
): RuntimeChannelSender<Waiter, Value> | null {
  const [first] = senders;

  if (!first) {
    return null;
  }

  const [key, value] = first;
  senders.delete(key);

  return value;
}

const RENDEZVOUS_CAPACITY = 0;
const EMPTY_SIZE = 0;

interface RuntimeChannelSender<Waiter, Value> {
  readonly value: Value;
  readonly waiter: Waiter;
}

interface RuntimeChannelTake<Waiter, Value, Outcome> {
  readonly result: ReceiveResult<Value, Outcome>;
  readonly sender: Waiter | null;
}

interface RuntimeChannelPut<Waiter, Outcome> {
  readonly result: SendResult<Outcome>;
  readonly receiver: Waiter | null;
}

interface RuntimeChannelWaiters<Waiter> {
  readonly receivers: readonly Waiter[];
  readonly senders: readonly Waiter[];
}

type ChannelKind = "bounded" | "rendezvous" | "unbounded";

type ChannelState<Outcome> =
  | { readonly kind: "open" }
  | { readonly kind: "closed"; readonly outcome: Outcome }
  | { readonly kind: "revoked" };
