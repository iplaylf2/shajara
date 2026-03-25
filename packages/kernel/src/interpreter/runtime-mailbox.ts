// oxlint-disable no-magic-numbers
import type { MessageKey } from "#/contracts";
import type { RuntimeProcess } from "./runtime-process";
import { option } from "fp-ts";

export class RuntimeMailbox {
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

  public receive(process: RuntimeProcess<unknown>, messageKey: MessageKey<unknown>): void {
    if (!this.#receiverKeys.has(process)) {
      process.observe(() => {
        if (!process.isClosed) {
          return;
        }

        this.#unregisterReceiver(process);
      });
    }

    this.#registerReceiver(messageKey, process);
    process.receive(messageKey);
  }

  // oxlint-disable-next-line max-statements
  public send<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const queues = this.#receiverQueues.get(messageKey);

    if (queues) {
      switch (queues.length) {
        case 0: {
          this.#receiverQueues.delete(messageKey);
          break;
        }
        case 1: {
          this.#receiverQueues.delete(messageKey);
          const [process] = queues;
          process!.accept(value);
          return;
        }
        default: {
          const process = queues.shift()!;
          process.accept(value);
          return;
        }
      }
    }

    this.#bufferMessage(messageKey, value);
  }

  public clear(): void {
    this.#mailboxes.clear();
    this.#receiverQueues.clear();
    this.#receiverKeys.clear();
  }

  #registerReceiver(messageKey: MessageKey<unknown>, process: RuntimeProcess<unknown>): void {
    const keys = this.#receiverKeys.getOrInsertComputed(process, () => new Set());
    keys.add(messageKey);

    const queues = this.#receiverQueues.getOrInsertComputed(messageKey, () => []);
    queues.push(process);
  }

  // oxlint-disable-next-line max-statements
  #unregisterReceiver(process: RuntimeProcess<unknown>): void {
    const messageKeys = this.#receiverKeys.get(process);

    if (!messageKeys) {
      this.#receiverKeys.delete(process);
      return;
    }

    for (const messageKey of messageKeys) {
      const receiveQueue = this.#receiverQueues.get(messageKey);

      if (!receiveQueue) {
        continue;
      }

      const nextQueue = receiveQueue.filter((receiver) => receiver !== process);
      receiveQueue.splice(QUEUE_BEGIN, receiveQueue.length, ...nextQueue);
    }

    this.#receiverKeys.delete(process);
  }

  #bufferMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const mailbox = this.#mailboxes.getOrInsertComputed(messageKey, () => []);
    mailbox.push(value);
  }

  readonly #mailboxes = new Map<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new Map<MessageKey<unknown>, RuntimeProcess<unknown>[]>();
  readonly #receiverKeys = new Map<RuntimeProcess<unknown>, Set<MessageKey<unknown>>>();
}

const QUEUE_BEGIN = 0;
