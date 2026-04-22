import type {
  ChannelHandle,
  ChannelReceiver,
  ChannelSender,
  ReceiveResult,
  SendResult,
} from "#/sigils/index";
import type { KEY_TOKEN, Suppressor } from "#/contracts";

export class RuntimeChannel<Value> implements ChannelReceiver<Value>, ChannelSender<Value> {
  public constructor(
    private readonly capacity: number,
    private readonly onDisposed: () => void,
  ) {
    this.#kind = channelKindOf(capacity);
  }

  public handle(): ChannelHandle<Value> {
    return [this, this];
  }

  public close(suppressor: Suppressor): void {
    if (this.#status !== "open") {
      return;
    }

    this.#dispose("closed", suppressor);
  }

  public receiveNonBlock(suppressor: Suppressor): ReceiveResult<Value> {
    if (this.#buffer.length > EMPTY_SIZE) {
      const value = this.#buffer.shift()!;

      this.#fillAvailableBuffer(suppressor);

      return { kind: "value", value };
    }

    const sender = takeFirst(this.#senders);
    if (sender) {
      sender.settle({ kind: "sent" }, suppressor);

      return { kind: "value", value: sender.value! };
    }

    return { kind: this.#status } as ReceiveResult<Value>;
  }

  public enqueueReceiver(receiver: unknown, settle: ChannelSettler<ReceiveResult<Value>>): void {
    this.#receivers.set(receiver, settle);
  }

  public discardReceiver(receiver: unknown): void {
    this.#receivers.delete(receiver);
  }

  public sendNonBlock(value: Value, suppressor: Suppressor): SendResult {
    if (this.#status !== "open") {
      return { kind: this.#status };
    }

    const receiver = takeFirst(this.#receivers);
    if (receiver) {
      receiver({ kind: "value", value }, suppressor);

      return { kind: "sent" };
    }

    this.#buffer.push(value);

    return { kind: "sent" };
  }

  public enqueueSender(sender: unknown, settle: ChannelSettler<SendResult>, value: Value): void {
    this.#senders.set(sender, { settle, value });
  }

  public discardSender(sender: unknown): void {
    this.#senders.delete(sender);
  }

  public revoke(): ChannelNotification {
    if (this.#status !== "open") {
      return () => [];
    }

    return (suppressor) => {
      this.#dispose("revoked", suppressor);
    };
  }

  public get isReceiveReady(): boolean {
    return this.#status !== "open" || this.#isReadable;
  }

  public get isSendReady(): boolean {
    return this.#status !== "open" || this.#isWritable;
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: ChannelReceiver<Value>[typeof KEY_TOKEN] &
    ChannelSender<Value>[typeof KEY_TOKEN];

  #fillAvailableBuffer(suppressor: Suppressor): void {
    if (this.#kind !== "bounded") {
      return;
    }

    const sender = takeFirst(this.#senders);
    if (sender) {
      this.#buffer.push(sender.value);
      sender.settle({ kind: "sent" }, suppressor);
    }
  }

  #dispose(status: Exclude<ChannelStatus, "open">, suppressor: Suppressor): void {
    this.#status = status;

    this.#flush(status, suppressor);
    this.onDisposed();
  }

  #flush(status: Exclude<ChannelStatus, "open">, suppressor: Suppressor): void {
    while (this.#receivers.size > EMPTY_SIZE && this.#buffer.length > EMPTY_SIZE) {
      const receiver = takeFirst(this.#receivers)!;
      const value = this.#buffer.shift()!;

      receiver({ kind: "value", value }, suppressor);
    }

    for (const settle of this.#receivers.values()) {
      settle({ kind: status }, suppressor);
    }

    for (const { settle } of this.#senders.values()) {
      settle({ kind: status }, suppressor);
    }

    this.#receivers.clear();
    this.#senders.clear();
  }

  get #isReadable(): boolean {
    return this.#buffer.length + this.#senders.size > EMPTY_SIZE;
  }

  get #isWritable(): boolean {
    return this.capacity - this.#buffer.length + this.#receivers.size > EMPTY_SIZE;
  }

  readonly #kind: ChannelKind;
  #status: ChannelStatus = "open";
  #buffer: Value[] = [];
  // ECMAScript Map preserves insertion order; waiter maps are FIFO queues keyed for discard.
  readonly #receivers = new Map<unknown, ChannelSettler<ReceiveResult<Value>>>();
  readonly #senders = new Map<unknown, ChannelSenderWaiter<Value>>();
}

export type ChannelSettler<Result> = (result: Result, suppressor: Suppressor) => void;

export type ChannelNotification = (suppressor: Suppressor) => void;

function channelKindOf(capacity: number): ChannelKind {
  switch (capacity) {
    case RENDEZVOUS_CAPACITY:
      return "rendezvous";
    case Infinity:
      return "unbounded";
    default:
      return "bounded";
  }
}

function takeFirst<Key, Value>(items: Map<Key, Value>): Value | null {
  const [first] = items;

  if (first) {
    const [key, value] = first;
    items.delete(key);

    return value;
  }

  return null;
}

const EMPTY_SIZE = 0;
const RENDEZVOUS_CAPACITY = 0;

interface ChannelSenderWaiter<out Value> {
  readonly settle: ChannelSettler<SendResult>;
  readonly value: Value;
}

type ChannelKind = "bounded" | "rendezvous" | "unbounded";

type ChannelStatus = "closed" | "open" | "revoked";
