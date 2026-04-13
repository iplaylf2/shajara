// oxlint-disable no-magic-numbers
import { option, readonlyArray } from "fp-ts";
import type { MessageKey } from "#/contracts";

export class RuntimeMailbox<Receiver> {
  public tryReceive<Value>(messageKey: MessageKey<Value>): option.Option<Value> {
    const mailbox = this.#mailboxes.get(messageKey);

    if (mailbox) {
      switch (mailbox.length) {
        case 0: {
          this.#mailboxes.delete(messageKey);
          break;
        }
        case 1: {
          this.#mailboxes.delete(messageKey);
          return option.some(mailbox[0] as Value);
        }
        default: {
          const value = mailbox.shift() as Value;
          return option.some(value);
        }
      }
    }

    return option.none;
  }

  public enqueueReceiver(receiver: Receiver, messageKey: MessageKey<unknown>): void {
    const keys = this.#receiverKeys.getOrInsertComputed(receiver, () => new Set());
    keys.add(messageKey);

    const queues = this.#receiverQueues.getOrInsertComputed(messageKey, () => []);
    queues.push(receiver);
  }

  public send<Value>(messageKey: MessageKey<Value>, value: Value): Receiver | null {
    const queues = this.#receiverQueues.get(messageKey);

    if (queues) {
      switch (queues.length) {
        case 0: {
          this.#receiverQueues.delete(messageKey);
          break;
        }
        case 1: {
          this.#receiverQueues.delete(messageKey);
          const [receiver] = queues;
          return receiver!;
        }
        default: {
          const receiver = queues.shift()!;
          return receiver;
        }
      }
    }

    this.#bufferMessage(messageKey, value);
    return null;
  }

  public cancelReceiver(receiver: Receiver): void {
    const messageKeys = this.#receiverKeys.get(receiver);

    if (messageKeys) {
      for (const messageKey of messageKeys) {
        this.#removeReceiverFromQueue(messageKey, receiver);
      }

      this.#receiverKeys.delete(receiver);
    }
  }

  public clear(): void {
    this.#mailboxes.clear();
    this.#receiverQueues.clear();
    this.#receiverKeys.clear();
  }

  #removeReceiverFromQueue(messageKey: MessageKey<unknown>, receiver: Receiver): void {
    const receiveQueue = this.#receiverQueues.get(messageKey);

    if (!receiveQueue) {
      return;
    }

    const nextQueue = receiveQueue.filter((entry) => entry !== receiver);
    if (readonlyArray.isEmpty(nextQueue)) {
      this.#receiverQueues.delete(messageKey);
    } else {
      receiveQueue.splice(0, receiveQueue.length, ...nextQueue);
    }
  }

  #bufferMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const mailbox = this.#mailboxes.getOrInsertComputed(messageKey, () => []);
    mailbox.push(value);
  }

  readonly #mailboxes = new Map<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new Map<MessageKey<unknown>, Receiver[]>();
  readonly #receiverKeys = new Map<Receiver, Set<MessageKey<unknown>>>();
}
