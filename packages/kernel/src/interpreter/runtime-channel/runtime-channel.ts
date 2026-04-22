// oxlint-disable class-methods-use-this
import type {
  ChannelHandle,
  ChannelReceiver,
  ChannelSender,
  ReceiveResult,
  SendResult,
} from "#/sigils/index";
import type { KEY_TOKEN, Suppressor } from "#/contracts";
import type { RuntimeProcessKeeper } from "#/interpreter/runtime-process";

export class RuntimeChannel<Value> implements ChannelReceiver<Value>, ChannelSender<Value> {
  public constructor(
    private readonly capacity: number,
    private readonly dispose: () => void,
  ) {
    // oxlint-disable-next-line no-void
    void this.capacity;
  }

  public handle(): ChannelHandle<Value> {
    return [this, this];
  }

  public close(_suppressor: Suppressor): void {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public receiveNonBlock(_suppressor: Suppressor): ReceiveResult<Value> {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public sendNonBlock(_value: Value, _suppressor: Suppressor): SendResult {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public enqueueReceiver(
    _process: RuntimeProcessKeeper,
    _settle: ChannelSettler<ReceiveResult<Value>>,
  ): void {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public discardReceiver(_process: RuntimeProcessKeeper): void {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public enqueueSender(
    _process: RuntimeProcessKeeper,
    _settle: ChannelSettler<SendResult>,
    _value: Value,
  ): void {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public discardSender(_process: RuntimeProcessKeeper): void {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public revoke(): ChannelNotification {
    this.dispose();

    throw new Error("Channel runtime is not implemented yet.");
  }

  public get isReadable(): boolean {
    throw new Error("Channel runtime is not implemented yet.");
  }

  public get isWritable(): boolean {
    throw new Error("Channel runtime is not implemented yet.");
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: ChannelReceiver<Value>[typeof KEY_TOKEN] &
    ChannelSender<Value>[typeof KEY_TOKEN];
}

export type ChannelSettler<Result> = (result: Result, suppressor: Suppressor) => void;

export type ChannelNotification = (suppressor: Suppressor) => void;
